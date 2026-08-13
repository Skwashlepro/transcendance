package game

import (
	"math"
	"sync"
	"time"
)

const (
	FieldWidth  = 800.0
	FieldHeight = 600.0
	PaddleWidth = 12.0
	PaddleHeight = 100.0
	BallSize    = 12.0
	PaddleSpeed = 8.0
	BallSpeed   = 6.0
	WinScore    = 5
	TickRate    = 60
)

type Paddle struct {
	Y    float64 `json:"y"`
	Side int     `json:"side"` // 1 = left, 2 = right
}

type Ball struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
}

type GameState struct {
	Ball       Ball    `json:"ball"`
	Paddle1    Paddle  `json:"paddle1"`
	Paddle2    Paddle  `json:"paddle2"`
	Score1     int     `json:"score1"`
	Score2     int     `json:"score2"`
	Status     string  `json:"status"` // waiting, countdown, playing, finished
	Countdown  int     `json:"countdown"`
	Winner     int     `json:"winner"` // 0=none, 1=left, 2=right
	Timestamp  int64   `json:"timestamp"`
}

type PongGame struct {
	mu          sync.RWMutex
	ID          string
	State       GameState
	Player1ID   int
	Player2ID   int // 0 for AI
	IsAI        bool
	Input1      float64 // -1 up, 0 none, 1 down
	Input2      float64
	Running     bool
	Paused      bool
	StopCh      chan struct{}
	OnFinish    func(game *PongGame)
	AIReaction  float64 // seconds delay
	AIError     float64 // max pixel error
}

func NewPongGame(id string, player1ID int, player2ID int, isAI bool) *PongGame {
	g := &PongGame{
		ID:         id,
		Player1ID:  player1ID,
		Player2ID:  player2ID,
		IsAI:       isAI,
		StopCh:     make(chan struct{}),
		AIReaction: 0.18,
		AIError:    70.0,
	}
	g.resetState()
	return g
}

func (g *PongGame) resetState() {
	centerY := (FieldHeight - PaddleHeight) / 2
	g.State = GameState{
		Ball:    Ball{X: FieldWidth / 2, Y: FieldHeight / 2, VX: BallSpeed, VY: BallSpeed * 0.5},
		Paddle1: Paddle{Y: centerY, Side: 1},
		Paddle2: Paddle{Y: centerY, Side: 2},
		Status:  "countdown",
		Countdown: 3,
	}
}

func (g *PongGame) Start() {
	g.Running = true
	go g.loop()
}

func (g *PongGame) Stop() {
	if g.Running {
		g.Running = false
		close(g.StopCh)
	}
}

// Pause freezes physics updates without stopping the game loop, so a
// disconnected remote player can rejoin the same match in progress.
func (g *PongGame) Pause() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.Paused = true
}

func (g *PongGame) Resume() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.Paused = false
}

func (g *PongGame) IsPaused() bool {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.Paused
}

func (g *PongGame) SetInput(playerID int, direction float64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if playerID == g.Player1ID {
		g.Input1 = clamp(direction, -1, 1)
	} else if playerID == g.Player2ID {
		g.Input2 = clamp(direction, -1, 1)
	}
}

func (g *PongGame) GetState() GameState {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.State
}

func (g *PongGame) loop() {
	ticker := time.NewTicker(time.Second / TickRate)
	defer ticker.Stop()

	countdownTimer := time.Now()
	lastAIUpdate := time.Now()

	for {
		select {
		case <-g.StopCh:
			return
		case <-ticker.C:
			g.mu.Lock()

			if g.Paused {
				g.mu.Unlock()
				continue
			}

			if g.State.Status == "countdown" {
				if time.Since(countdownTimer) >= time.Second {
					g.State.Countdown--
					countdownTimer = time.Now()
					if g.State.Countdown <= 0 {
						g.State.Status = "playing"
						// Random serve direction
						if time.Now().UnixNano()%2 == 0 {
							g.State.Ball.VX = -BallSpeed
						} else {
							g.State.Ball.VX = BallSpeed
						}
					}
				}
				g.State.Timestamp = time.Now().UnixMilli()
				g.mu.Unlock()
				continue
			}

			if g.State.Status != "playing" {
				g.mu.Unlock()
				continue
			}

			// AI paddle control
			if g.IsAI && time.Since(lastAIUpdate).Seconds() >= g.AIReaction {
				g.updateAI()
				lastAIUpdate = time.Now()
			}

			// Move paddles
			g.State.Paddle1.Y += g.Input1 * PaddleSpeed
			g.State.Paddle2.Y += g.Input2 * PaddleSpeed
			g.State.Paddle1.Y = clamp(g.State.Paddle1.Y, 0, FieldHeight-PaddleHeight)
			g.State.Paddle2.Y = clamp(g.State.Paddle2.Y, 0, FieldHeight-PaddleHeight)

			// Move ball
			g.State.Ball.X += g.State.Ball.VX
			g.State.Ball.Y += g.State.Ball.VY

			// Top/bottom wall bounce
			if g.State.Ball.Y <= 0 || g.State.Ball.Y >= FieldHeight-BallSize {
				g.State.Ball.VY = -g.State.Ball.VY
				g.State.Ball.Y = clamp(g.State.Ball.Y, 0, FieldHeight-BallSize)
			}

			// Paddle collisions
			g.checkPaddleCollision(&g.State.Paddle1, 0)
			g.checkPaddleCollision(&g.State.Paddle2, FieldWidth-PaddleWidth)

			// Scoring
			if g.State.Ball.X < 0 {
				g.State.Score2++
				g.resetBall(-1)
			} else if g.State.Ball.X > FieldWidth {
				g.State.Score1++
				g.resetBall(1)
			}

			// Check win
			if g.State.Score1 >= WinScore || g.State.Score2 >= WinScore {
				g.State.Status = "finished"
				if g.State.Score1 >= WinScore {
					g.State.Winner = 1
				} else {
					g.State.Winner = 2
				}
				// The loop goroutine is exiting, so mark the game not-running
				// or a later Rematch() call would think it's still active and skip restarting it.
				g.Running = false
				g.mu.Unlock()
				if g.OnFinish != nil {
					g.OnFinish(g)
				}
				return
			}

			g.State.Timestamp = time.Now().UnixMilli()
			g.mu.Unlock()
		}
	}
}

func (g *PongGame) updateAI() {
	paddleCenter := g.State.Paddle2.Y + PaddleHeight/2
	ballX := g.State.Ball.X
	ballY := g.State.Ball.Y
	ballVY := g.State.Ball.VY
	ballVX := g.State.Ball.VX

	targetY := ballY + BallSize/2

	if ballVX > 0 {
		distToPaddle := (FieldWidth - PaddleWidth) - ballX
		if distToPaddle > 0 && ballVX != 0 {
			timeToReach := distToPaddle / ballVX
			predictedY := ballY + ballVY*timeToReach
			for predictedY < 0 || predictedY > FieldHeight-BallSize {
				if predictedY < 0 {
					predictedY = -predictedY
				} else {
					predictedY = 2*(FieldHeight-BallSize) - predictedY
				}
			}
			targetY = predictedY + BallSize/2
		}
	}

	// Human-like inaccuracy: AI predicts the ball late and misses by a visible amount.
	variance := math.Sin(float64(time.Now().UnixNano()) * 0.0000007) * g.AIError
	targetY += variance

	// Occasionally make a small timing mistake and chase the wrong vertical position.
	if time.Now().UnixNano()%11 == 0 {
		targetY += 28.0
	}
	if time.Now().UnixNano()%17 == 0 {
		targetY -= 18.0
	}

	// Clamp to field bounds to avoid absurd movement.
	targetY = clamp(targetY, 0, FieldHeight-PaddleHeight)

	diff := targetY - paddleCenter
	if math.Abs(diff) < 12 {
		g.Input2 = 0
	} else if diff > 0 {
		g.Input2 = 1
	} else {
		g.Input2 = -1
	}

	// Slightly reduce confidence and make it less consistent on long rallies.
	if time.Now().UnixNano()%23 == 0 {
		g.Input2 *= 0.6
	}
}

func (g *PongGame) checkPaddleCollision(paddle *Paddle, paddleX float64) {
	ball := &g.State.Ball
	if ball.X+BallSize >= paddleX && ball.X <= paddleX+PaddleWidth {
		if ball.Y+BallSize >= paddle.Y && ball.Y <= paddle.Y+PaddleHeight {
			// Reverse X velocity and add angle based on hit position
			ball.VX = -ball.VX
			hitPos := (ball.Y + BallSize/2 - paddle.Y) / PaddleHeight
			ball.VY = (hitPos - 0.5) * BallSpeed * 2

			// Ensure minimum speed
			speed := math.Sqrt(ball.VX*ball.VX + ball.VY*ball.VY)
			if speed < BallSpeed {
				ball.VX = ball.VX / speed * BallSpeed
				ball.VY = ball.VY / speed * BallSpeed
			}

			// Push ball out of paddle
			if ball.VX > 0 {
				ball.X = paddleX + PaddleWidth
			} else {
				ball.X = paddleX - BallSize
			}
		}
	}
}

func (g *PongGame) resetBall(scorer int) {
	g.State.Ball = Ball{
		X:  FieldWidth / 2,
		Y:  FieldHeight / 2,
		VX: BallSpeed,
		VY: BallSpeed * 0.3,
	}
	if scorer == 1 {
		g.State.Ball.VX = BallSpeed
	} else {
		g.State.Ball.VX = -BallSpeed
	}
}

func (g *PongGame) Rematch() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.State.Score1 = 0
	g.State.Score2 = 0
	g.State.Winner = 0
	g.resetState()
	if !g.Running {
		g.Running = true
		g.StopCh = make(chan struct{})
		go g.loop()
	}
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
