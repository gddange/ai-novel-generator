# AI小说生成器 🚀

一个基于多Agent协作的智能小说生成系统，通过三个专业AI角色的协作来创作高质量的小说内容。

## 🌟 系统特色

### 三个专业Agent角色
- **📝 作者Agent (AuthorAgent)**: 负责具体的章节内容创作
- **📋 大纲编辑Agent (OutlineEditorAgent)**: 负责故事结构和大纲设计
- **✨ 润色编辑Agent (StyleEditorAgent)**: 负责文本润色和风格统一

### 核心功能
- 🔍 **智能搜索**: 集成搜索引擎，为创作提供资料支持
- 💾 **上下文管理**: 智能压缩和管理对话历史，保持创作连贯性
- 📚 **本地存储**: 自动保存章节内容和项目进度
- 🌐 **Web界面**: 直观的用户界面，实时监控创作进度
- 🤖 **Agent协作**: 三个Agent智能协作，确保内容质量

## 🏗️ 系统架构

```
game_for_3/
├── package.json              # 项目配置
├── server/                   # 后端服务
│   ├── app.js               # 服务器主文件
│   ├── agents/              # Agent实现
│   │   ├── BaseAgent.js     # 基础Agent类
│   │   ├── AuthorAgent.js   # 作者Agent
│   │   ├── OutlineEditorAgent.js  # 大纲编辑Agent
│   │   ├── StyleEditorAgent.js    # 润色编辑Agent
│   │   └── AgentManager.js  # Agent管理器
│   ├── routes/              # API路由
│   │   ├── agents.js        # Agent相关API
│   │   ├── novels.js        # 小说管理API
│   │   └── search.js        # 搜索API
│   ├── services/            # 服务层
│   │   └── SearchService.js # 搜索服务
│   └── utils/               # 工具类
│       └── ContextManager.js # 上下文管理
├── public/                  # 前端文件
│   ├── index.html          # 主页面
│   └── js/
│       └── app.js          # 前端应用
└── test_system.sh          # 系统测试脚本
```

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd game_for_3
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env 文件
   echo "OPENAI_API_KEY=your-openai-api-key" > .env
   ```

4. **启动服务**
   ```bash
   npm start
   ```

5. **访问应用**
   打开浏览器访问: `http://localhost:3000`

## 📖 使用指南

### 创建新项目
1. 在Web界面中点击"创建新项目"
2. 输入小说主题和类型
3. 系统将自动启动三个Agent的协作流程

### 创作流程
1. **规划阶段**: 作者和大纲编辑协作制定故事框架
2. **写作阶段**: 作者根据大纲创作2-3个章节
3. **润色阶段**: 润色编辑优化文本质量和风格一致性
4. **循环迭代**: 重复上述流程直到完成整部小说

### Agent协作机制
- **作者 ↔ 大纲编辑**: 协商故事结构和情节发展
- **作者 → 润色编辑**: 提交原始章节内容
- **润色编辑 → 作者**: 反馈润色建议和风格指导

## 🔧 API接口

### Agent管理
- `GET /api/agents/status` - 获取Agent状态
- `POST /api/agents/start` - 启动新项目
- `POST /api/agents/planning` - 执行规划阶段
- `POST /api/agents/writing` - 执行写作阶段
- `POST /api/agents/polishing` - 执行润色阶段

### 小说管理
- `GET /api/novels/chapters/:projectId` - 获取章节列表
- `GET /api/novels/chapter/:projectId/:chapterNumber` - 获取特定章节
- `GET /api/novels/export/:projectId/:format` - 导出小说

### 搜索功能
- `POST /api/search/query` - 执行搜索查询
- `GET /api/search/suggestions` - 获取搜索建议
- `GET /api/search/history/:agentId` - 获取搜索历史

## 🧪 测试

运行系统完整性测试:
```bash
./test_system.sh
```

测试覆盖:
- ✅ 文件结构完整性
- ✅ 核心功能可用性
- ✅ API路由配置
- ✅ 前端界面完整性
- ✅ Agent搜索功能
- ✅ 上下文管理功能

## 🔍 核心特性详解

### 智能搜索系统
- 支持多种搜索类型：通用、角色、情节、设定、历史
- 搜索结果缓存和历史记录
- 基于搜索结果的创作灵感生成

### 上下文管理
- 智能重要性评分算法
- 自动内容压缩和遗忘机制
- 保持创作上下文的连贯性

### Agent协作机制
- 基于角色的专业分工
- 实时通信和状态同步
- 质量控制和反馈循环

## 📊 系统监控

### 实时状态监控
- Agent工作状态
- 创作进度跟踪
- 系统性能指标

### 数据统计
- 章节创作统计
- 搜索使用情况
- Agent协作效率

## 🛠️ 开发指南

### 扩展新Agent
1. 继承 `BaseAgent` 类
2. 实现必要的接口方法
3. 在 `AgentManager` 中注册

### 添加新的搜索类型
1. 在 `SearchService` 中定义新类型
2. 更新搜索路由配置
3. 在前端添加相应选项

### 自定义上下文策略
1. 修改 `ContextManager` 的评分算法
2. 调整压缩和遗忘参数
3. 测试不同场景下的效果

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 支持

如有问题，请通过以下方式联系：
- 提交GitHub Issue
- 发送邮件至项目维护者

---

**🎉 开始你的AI小说创作之旅吧！**