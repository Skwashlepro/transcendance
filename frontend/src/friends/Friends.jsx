import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Friends.css';

function Friends() {
  const { username } = useParams();
  const [friends, setFriends] = useState([
    
  ]);
  