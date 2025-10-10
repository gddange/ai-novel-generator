require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const { Server } = require('socket.io');

const agentRoutes = require('./routes/agents');
const novelsRouter = require('./routes/novels');
const contextRoutes = require('./routes/context');
const searchRoutes = require('./routes/search');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 中间件
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API路由
app.use('/api/agents', agentRoutes);
app.use('/api/novels', novelsRouter);
app.use('/api/context', contextRoutes);
app.use('/api/search', searchRoutes);

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);
  
  socket.on('join-novel', (novelId) => {
    socket.join(novelId);
    console.log(`客户端 ${socket.id} 加入小说房间: ${novelId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('客户端已断开连接:', socket.id);
  });
});

// 将io实例传递给路由
app.set('io', io);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 处理前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

server.listen(PORT, () => {
  console.log(`小说生成器服务器运行在端口 ${PORT}`);
  console.log(`前端地址: http://localhost:${PORT}`);
  console.log(`API地址: http://localhost:${PORT}/api`);
});

module.exports = app;