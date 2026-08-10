package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/auth"
	"transcendance/backend/src/database"
	"transcendance/backend/src/handlers"
	"transcendance/backend/src/ws"
)

func main() {
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Database connection failed:", err)
	}
	defer db.Close()

	hub := ws.NewHub(db)
	go hub.Run()

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	os.MkdirAll(uploadDir+"/avatars", 0755)

	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", corsOrigin)
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.Static("/uploads", uploadDir)

	api := r.Group("/api")
	{
		api.GET("/health", handlers.HealthHandler(db))

		authGroup := api.Group("/auth")
		{
			authGroup.POST("/signup", auth.SignupHandler(db))
			authGroup.POST("/signin", auth.SigninHandler(db))
			authGroup.GET("/me", auth.AuthMiddleware(), auth.MeHandler(db))
		}

		users := api.Group("/users")
		{
			users.GET("/search", auth.AuthMiddleware(), handlers.SearchUsersHandler(db))
			users.GET("/:username", handlers.GetProfileHandler(db))
			users.PUT("/profile", auth.AuthMiddleware(), handlers.UpdateProfileHandler(db))
			users.POST("/avatar", auth.AuthMiddleware(), handlers.UploadAvatarHandler(db))
			users.GET("/:username/matches", handlers.GetMatchHistoryHandler(db))
		}

		friends := api.Group("/friends", auth.AuthMiddleware())
		{
			friends.GET("", func(c *gin.Context) {
				handlers.ListFriendsHandler(db, hub.OnlineUsers())(c)
			})
			friends.GET("/pending", handlers.ListPendingHandler(db))
			friends.POST("", handlers.AddFriendHandler(db))
			friends.POST("/accept/:id", handlers.AcceptFriendHandler(db))
			friends.DELETE("/:username", handlers.RemoveFriendHandler(db))
		}

		chat := api.Group("/chat", auth.AuthMiddleware())
		{
			chat.GET("/conversations", handlers.GetConversationsHandler(db))
			chat.GET("/:username", handlers.GetChatHistoryHandler(db))
			chat.POST("/:username", handlers.SendMessageHandler(db))
		}

		api.GET("/stats", auth.AuthMiddleware(), handlers.GetMyStatsHandler(db))
	}

	r.GET("/ws", hub.HandleWebSocket)

	log.Println("Server running on :8000")
	if err := r.Run(":8000"); err != nil {
		log.Fatal(err)
	}
}
