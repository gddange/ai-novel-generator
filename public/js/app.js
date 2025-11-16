class NovelGeneratorApp {
    constructor() {
        this.currentProject = null;
        this.currentProjectId = null;
        this.agents = {
            author: { status: 'idle', progress: 0 },
            outline: { status: 'idle', progress: 0 },
            polish: { status: 'idle', progress: 0 }
        };
        this.chapters = [];
        this.isGenerating = false;
        
        // 初始化Socket.IO连接
        this.socket = io();
        this.setupSocketListeners();
        
        this.init();
    }

    setupSocketListeners() {
        console.log('🔌 设置Socket.IO事件监听器...');
        
        this.socket.on('connect', () => {
            console.log('✅ Socket.IO连接成功');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket.IO连接断开');
        });

        this.socket.on('error', (error) => {
            console.error('❌ Socket.IO错误:', error);
        });

        // 监听规划完成事件
        this.socket.on('planning-completed', (result) => {
            console.log('📋 收到规划完成事件:', result);
            this.updateCurrentActivity('🎉 大纲制定完成！');
            this.updateOverallProgress(30);
            this.updateAgentStatus('outline', 'completed', 100, '大纲制定完成');
            
            if (this.planningResolve) {
                this.planningResolve(result);
                this.planningResolve = null;
            }
        });

        // 监听规划错误事件
        this.socket.on('planning-error', (error) => {
            console.error('❌ 收到规划错误事件:', error);
            this.updateCurrentActivity(`❌ 规划失败: ${error.message}`);
            
            if (this.planningReject) {
                this.planningReject(new Error(error.message));
                this.planningReject = null;
            }
        });

        // 监听写作进度事件
        this.socket.on('writing-progress', (result) => {
            console.log('✍️ 收到写作进度事件:', result);
            this.updateCurrentActivity(`✍️ 写作进度更新: ${result.message}`);
            this.updateAgentStatus('author', 'working', result.progress || 50, result.message);
        });

        // 监听润色进度事件
        this.socket.on('polishing-progress', (result) => {
            console.log('✨ 收到润色进度事件:', result);
            this.updateCurrentActivity(`✨ 润色进度更新: ${result.message}`);
            this.updateAgentStatus('polish', 'working', result.progress || 50, result.message);
        });

        // 监听项目启动事件
        this.socket.on('project-started', (result) => {
            console.log('🚀 收到项目启动事件:', result);
            this.updateCurrentActivity('🚀 项目启动成功');
        });

        // 监听工作流程事件
        this.socket.on('workflow-started', (data) => {
            console.log('🔄 收到工作流程启动事件:', data);
            this.updateCurrentActivity('🔄 开始完整创作流程');
        });

        this.socket.on('workflow-completed', (result) => {
            console.log('🎉 收到工作流程完成事件:', result);
            this.updateCurrentActivity('🎉 创作流程完成！');
            this.updateOverallProgress(100);
        });

        this.socket.on('workflow-error', (error) => {
            console.error('❌ 收到工作流程错误事件:', error);
            this.updateCurrentActivity(`❌ 创作流程失败: ${error.error}`);
        });
    }

    init() {
        this.bindEvents();
        // 读取并应用设置到项目表单
        this.loadSettings();
        this.applySettingsToForm();
        this.checkSystemStatus();
        this.loadProjects();
    }

    bindEvents() {
        // 导航按钮
        document.getElementById('startNewProject').addEventListener('click', () => {
            this.showProjectForm();
        });

        document.getElementById('projectsBtn').addEventListener('click', () => {
            this.showProjectsList();
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            this.showWelcomeSection();
        });

        // 新增：设置按钮打开设置面板
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('newProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewProject();
        });

        document.getElementById('cancelProject').addEventListener('click', () => {
            this.showWelcomeSection();
        });

        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });

        // 导出和预览按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportOptions();
        });

        document.getElementById('previewBtn').addEventListener('click', () => {
            this.previewNovel();
        });
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (!data.success) {
                this.showError('系统连接失败，请检查服务器状态');
            }
        } catch (error) {
            console.error('系统状态检查失败:', error);
            this.showError('无法连接到服务器');
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/novels');
            const data = await response.json();
            
            if (data.success) {
                this.renderProjectsGrid(data.data);
            }
        } catch (error) {
            console.error('加载项目列表失败:', error);
        }
    }

    showProjectForm() {
        document.getElementById('welcomeSection').classList.add('hidden');
        document.getElementById('projectsList').classList.add('hidden');
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('projectForm').classList.remove('hidden');
    }

    showWelcomeSection() {
        document.getElementById('projectForm').classList.add('hidden');
        document.getElementById('projectsList').classList.add('hidden');
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('welcomeSection').classList.remove('hidden');
    }

    showProjectsList() {
        document.getElementById('welcomeSection').classList.add('hidden');
        document.getElementById('projectForm').classList.add('hidden');
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('projectsList').classList.remove('hidden');
        this.loadProjects();
    }

    showProgressSection() {
        document.getElementById('welcomeSection').classList.add('hidden');
        document.getElementById('projectForm').classList.add('hidden');
        document.getElementById('projectsList').classList.add('hidden');
        document.getElementById('progressSection').classList.remove('hidden');
    }

    validateForm() {
        const title = document.getElementById('novelTitle').value.trim();
        const genre = document.getElementById('novelGenre').value;
        const theme = document.getElementById('novelTheme').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();

        if (!title) {
            this.showError('请输入小说标题');
            return false;
        }

        if (!genre) {
            this.showError('请选择小说类型');
            return false;
        }

        if (!theme) {
            this.showError('请输入小说主题描述');
            return false;
        }

        if (!apiKey) {
            this.showError('请输入API Key');
            return false;
        }

        return true;
    }

    getFormData() {
        return {
            title: document.getElementById('novelTitle').value.trim(),
            genre: document.getElementById('novelGenre').value,
            theme: document.getElementById('novelTheme').value.trim(),
            apiProvider: document.getElementById('apiProvider').value,
            apiKey: document.getElementById('apiKey').value.trim()
        };
    }

    async createNewProject() {
        console.log('🚀 开始创建新项目...');
        
        if (!this.validateForm()) {
            console.log('❌ 表单验证失败');
            return;
        }

        const projectData = this.getFormData();
        console.log('📋 项目数据:', projectData);

        try {
            this.showLoading('正在创建项目...');
            
            console.log('📤 发送创建请求...');
            const response = await fetch('/api/agents/projects/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 项目创建成功:', result.data);
                
                this.currentProject = result.data;
                this.currentProjectId = result.data.projectId; // 修复：使用正确的字段名
                
                // 确保项目ID存在后再加入Socket.IO房间
                if (this.currentProjectId) {
                    this.socket.emit('join-novel', this.currentProjectId);
                    console.log(`🏠 加入项目房间: ${this.currentProjectId}`);
                } else {
                    console.error('❌ 项目ID为空，无法加入房间');
                }
                
                this.showProgressSection();
                this.startNovelGeneration();
            } else {
                this.showError(result.error || '项目创建失败');
            }
        } catch (error) {
            console.error('❌ 创建项目失败:', error);
            this.showError('创建项目时发生错误');
        } finally {
            this.hideLoading();
        }
    }

    async startNovelGeneration() {
        console.log('🚀 开始小说生成流程...');
        
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        this.updateCurrentActivity('初始化创作流程...');
        this.updateOverallProgress(5);

        try {
            console.log('🎯 开始规划阶段...');
            // 第一阶段：规划大纲
            await this.executePlanningPhase();
            
            console.log('✍️ 开始写作循环...');
            // 第二阶段：开始写作循环
            await this.executeWritingLoop();
            
            console.log('✅ 小说生成完成!');
            this.updateCurrentActivity('🎉 小说创作完成！');
            
        } catch (error) {
            console.error('❌ 小说生成过程出错:', error);
            this.updateCurrentActivity(`❌ 生成失败: ${error.message}`);
            this.showError('生成过程中发生错误: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async executePlanningPhase() {
        console.log('📋 执行规划阶段...');
        this.updateCurrentActivity('🤖 AI正在分析小说主题...');
        this.updateOverallProgress(10);

        try {
            console.log('📤 发送规划请求...');
            const response = await fetch(`/api/agents/projects/${this.currentProjectId}/planning`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`规划请求失败: ${response.status} ${response.statusText}`);
            }

            console.log('✅ 规划请求发送成功，等待AI处理...');
            this.updateCurrentActivity('🧠 AI正在制定创作大纲...');
            this.updateOverallProgress(20);

            // 等待规划完成事件
            return new Promise((resolve, reject) => {
                console.log('👂 监听规划完成事件...');
                
                // 设置超时
                const timeout = setTimeout(() => {
                    console.error('⏰ 规划阶段超时');
                    reject(new Error('规划阶段超时，请重试'));
                }, 120000); // 2分钟超时

                this.socket.once('planning-completed', (data) => {
                    console.log('🎉 收到规划完成事件:', data);
                    clearTimeout(timeout);
                    
                    this.updateCurrentActivity('✅ 大纲制定完成！');
                    this.updateOverallProgress(30);
                    
                    resolve(data);
                });

                this.socket.once('planning-error', (error) => {
                    console.error('❌ 规划阶段出错:', error);
                    clearTimeout(timeout);
                    reject(new Error(error.message || '规划阶段失败'));
                });
            });

        } catch (error) {
            console.error('❌ 规划阶段执行失败:', error);
            this.updateCurrentActivity(`❌ 规划失败: ${error.message}`);
            throw error;
        }
    }

    async executeWritingLoop() {
        let chapterCount = 0;
        const maxChapters = 10; // 可配置的最大章节数
        
        while (chapterCount < maxChapters && this.isGenerating) {
            // 写作阶段
            await this.executeWritingPhase(chapterCount + 1);
            
            // 润色阶段
            if (chapterCount % 2 === 1 || chapterCount === maxChapters - 1) {
                await this.executePolishingPhase(chapterCount - 1, chapterCount);
            }
            
            chapterCount++;
            
            // 更新整体进度
            const progress = Math.min(25 + (chapterCount / maxChapters) * 75, 100);
            this.updateOverallProgress(progress);
            
            // 加载最新章节
            await this.loadChapters();
        }
        
        this.updateCurrentActivity('小说创作完成！');
        this.updateAgentStatus('author', 'completed', 100, '创作完成');
        this.updateAgentStatus('polish', 'completed', 100, '润色完成');
    }

    async executeWritingPhase(chapterNumber) {
        this.updateAgentStatus('author', 'working', 50 + chapterNumber * 5, `正在创作第${chapterNumber}章...`);
        this.updateCurrentActivity(`正在创作第${chapterNumber}章...`);
        
        const response = await fetch(`/api/agents/projects/${this.currentProjectId}/writing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chapterNumber })
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.updateAgentStatus('author', 'ready', 60 + chapterNumber * 5, `第${chapterNumber}章创作完成`);
        } else {
            throw new Error(result.error || `第${chapterNumber}章创作失败`);
        }
    }

    async executePolishingPhase(startChapter, endChapter) {
        this.updateAgentStatus('polish', 'working', 30, `正在润色第${startChapter + 1}-${endChapter + 1}章...`);
        this.updateCurrentActivity(`正在润色第${startChapter + 1}-${endChapter + 1}章...`);
        
        const response = await fetch(`/api/agents/projects/${this.currentProjectId}/polishing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                startChapter: startChapter + 1, 
                endChapter: endChapter + 1 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.updateAgentStatus('polish', 'ready', 50 + endChapter * 5, `第${startChapter + 1}-${endChapter + 1}章润色完成`);
        } else {
            throw new Error(result.error || '润色失败');
        }
    }

    async loadChapters() {
        if (!this.currentProjectId) return;
        
        try {
            const response = await fetch(`/api/novels/${this.currentProjectId}/chapters`);
            const result = await response.json();
            
            if (result.success) {
                this.chapters = result.data.chapters;
                this.renderChaptersList();
            }
        } catch (error) {
            console.error('加载章节失败:', error);
        }
    }

    renderChaptersList() {
        const container = document.getElementById('chaptersList');
        
        if (this.chapters.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无章节内容</p>';
            return;
        }
        
        container.innerHTML = this.chapters.map(chapter => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900">第${chapter.number}章 ${chapter.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">
                            字数: ${chapter.wordCount} | 
                            状态: <span class="px-2 py-1 rounded-full text-xs ${chapter.status === 'polished' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${chapter.status === 'polished' ? '已润色' : '草稿'}
                            </span>
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                            创建时间: ${new Date(chapter.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="app.viewChapter(${chapter.number})" 
                                class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-eye mr-1"></i>查看
                        </button>
                        <button onclick="app.editChapter(${chapter.number})" 
                                class="text-green-600 hover:text-green-800 text-sm">
                            <i class="fas fa-edit mr-1"></i>编辑
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async viewChapter(chapterNumber) {
        try {
            const response = await fetch(`/api/novels/${this.currentProjectId}/chapters/${chapterNumber}`);
            const result = await response.json();
            
            if (result.success) {
                const chapter = result.data;
                this.showModal(`第${chapter.number}章 ${chapter.title}`, `
                    <div class="prose max-w-none">
                        <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p class="text-sm text-gray-600">
                                字数: ${chapter.metadata.wordCount} | 
                                创建时间: ${new Date(chapter.metadata.createdAt).toLocaleString()}
                                ${chapter.metadata.polishedAt ? ` | 润色时间: ${new Date(chapter.metadata.polishedAt).toLocaleString()}` : ''}
                            </p>
                        </div>
                        <div class="whitespace-pre-wrap">${chapter.content}</div>
                    </div>
                `);
            }
        } catch (error) {
            console.error('查看章节失败:', error);
            this.showError('无法加载章节内容');
        }
    }

    async editChapter(chapterNumber) {
        // 这里可以实现章节编辑功能
        this.showModal('编辑章节', `
            <p class="text-gray-600">章节编辑功能正在开发中...</p>
            <p class="text-sm text-gray-500 mt-2">您可以通过导出功能获取章节内容进行外部编辑。</p>
        `);
    }

    showExportOptions() {
        if (!this.currentProjectId) {
            this.showError('请先创建或选择一个项目');
            return;
        }
        
        this.showModal('导出小说', `
            <div class="space-y-4">
                <p class="text-gray-600">选择导出格式：</p>
                <div class="grid grid-cols-1 gap-3">
                    <button onclick="app.exportNovel('txt')" 
                            class="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <div class="flex items-center">
                            <i class="fas fa-file-alt text-blue-600 mr-3"></i>
                            <div class="text-left">
                                <div class="font-medium">纯文本 (.txt)</div>
                                <div class="text-sm text-gray-500">适合阅读和编辑</div>
                            </div>
                        </div>
                        <i class="fas fa-download text-gray-400"></i>
                    </button>
                    <button onclick="app.exportNovel('md')" 
                            class="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <div class="flex items-center">
                            <i class="fab fa-markdown text-blue-600 mr-3"></i>
                            <div class="text-left">
                                <div class="font-medium">Markdown (.md)</div>
                                <div class="text-sm text-gray-500">保留格式的文本文件</div>
                            </div>
                        </div>
                        <i class="fas fa-download text-gray-400"></i>
                    </button>
                    <button onclick="app.exportNovel('json')" 
                            class="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <div class="flex items-center">
                            <i class="fas fa-code text-blue-600 mr-3"></i>
                            <div class="text-left">
                                <div class="font-medium">JSON (.json)</div>
                                <div class="text-sm text-gray-500">包含完整数据的结构化文件</div>
                            </div>
                        </div>
                        <i class="fas fa-download text-gray-400"></i>
                    </button>
                </div>
            </div>
        `);
    }

    async exportNovel(format) {
        try {
            const response = await fetch(`/api/novels/${this.currentProjectId}/export/${format}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${this.currentProject.title}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.hideModal();
                this.showSuccess('导出成功！');
            } else {
                const error = await response.json();
                this.showError(error.error || '导出失败');
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出过程中发生错误');
        }
    }

    async previewNovel() {
        if (!this.currentProjectId) {
            this.showError('请先创建或选择一个项目');
            return;
        }
        
        try {
            const response = await fetch(`/api/novels/${this.currentProjectId}/full`);
            const result = await response.json();
            
            if (result.success) {
                const novel = result.data;
                this.showModal(`预览：${novel.projectInfo.title}`, `
                    <div class="prose max-w-none max-h-96 overflow-y-auto">
                        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 class="text-lg font-semibold mb-2">${novel.projectInfo.title}</h3>
                            <p class="text-sm text-gray-600">
                                类型: ${novel.projectInfo.genre} | 
                                总章节: ${novel.totalChapters} | 
                                总字数: ${novel.totalWords}
                            </p>
                            <p class="text-sm text-gray-700 mt-2">${novel.projectInfo.theme}</p>
                        </div>
                        ${novel.chapters.map(chapter => `
                            <div class="mb-6">
                                <h4 class="text-md font-semibold mb-2">第${chapter.number}章 ${chapter.title}</h4>
                                <div class="text-sm text-gray-700 whitespace-pre-wrap">${chapter.content.substring(0, 200)}${chapter.content.length > 200 ? '...' : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                `);
            }
        } catch (error) {
            console.error('预览失败:', error);
            this.showError('无法加载预览内容');
        }
    }

    renderProjectsGrid(projects) {
        const container = document.getElementById('projectsGrid');
        
        if (projects.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-folder-open text-gray-300 text-6xl mb-4"></i>
                    <p class="text-gray-500 text-lg">还没有项目</p>
                    <p class="text-gray-400 text-sm">点击"开始新项目"创建您的第一个小说</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = projects.map(project => `
            <div class="bg-white rounded-lg shadow-lg p-6 card-hover cursor-pointer" 
                 onclick="app.loadProject('${project.id}')">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-900 mb-1">${project.title}</h4>
                        <p class="text-sm text-gray-600">${project.genre}</p>
                    </div>
                    <span class="px-2 py-1 rounded-full text-xs ${this.getStatusColor(project.status)}">
                        ${this.getStatusText(project.status)}
                    </span>
                </div>
                <div class="text-sm text-gray-500 mb-4">
                    <p>章节数: ${project.chaptersCount}</p>
                    <p>创建时间: ${new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="event.stopPropagation(); app.loadProject('${project.id}')" 
                            class="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors">
                        <i class="fas fa-folder-open mr-1"></i>打开
                    </button>
                    <button onclick="event.stopPropagation(); app.deleteProject('${project.id}')" 
                            class="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusColor(status) {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'planning': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'completed': return '已完成';
            case 'in_progress': return '创作中';
            case 'planning': return '规划中';
            default: return '未知';
        }
    }

    async loadProject(projectId) {
        try {
            const response = await fetch(`/api/novels/${projectId}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentProject = result.data;
                this.currentProjectId = result.data.id || projectId; // 使用传入的projectId作为备选
                
                // 确保项目ID存在后再加入Socket.IO房间
                if (this.currentProjectId) {
                    this.socket.emit('join-novel', this.currentProjectId);
                    console.log(`🏠 加入项目房间: ${this.currentProjectId}`);
                } else {
                    console.error('❌ 项目ID为空，无法加入房间');
                }
                
                this.showProgressSection();
                await this.loadChapters();
                
                // 更新Agent状态显示
                this.updateAgentStatus('author', 'ready', 100, '项目已加载');
                this.updateAgentStatus('outline', 'completed', 100, '大纲已完成');
                this.updateAgentStatus('polish', 'ready', 80, '准备润色');
                this.updateCurrentActivity('项目已加载，可以继续创作');
                this.updateOverallProgress(60);
            }
        } catch (error) {
            console.error('加载项目失败:', error);
            this.showError('无法加载项目');
        }
    }

    async deleteProject(projectId) {
        if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
            try {
                // 这里需要实现删除API
                this.showSuccess('项目删除功能正在开发中');
            } catch (error) {
                console.error('删除项目失败:', error);
                this.showError('删除项目失败');
            }
        }
    }

    updateAgentStatus(agentType, status, progress, message) {
        this.agents[agentType] = { status, progress, message };
        
        const statusElement = document.getElementById(`${agentType}Status`);
        const messageElement = document.getElementById(`${agentType}Message`);
        
        if (statusElement) {
            const progressBar = statusElement.querySelector('div');
            progressBar.style.width = `${progress}%`;
            
            // 更新颜色
            progressBar.className = `h-2 rounded-full transition-all duration-500 ${this.getProgressBarColor(agentType, status)}`;
        }
        
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    getProgressBarColor(agentType, status) {
        const colors = {
            author: 'bg-blue-600',
            outline: 'bg-green-600',
            polish: 'bg-purple-600'
        };
        
        if (status === 'working') {
            return colors[agentType] + ' animate-pulse';
        }
        
        return colors[agentType];
    }

    updateCurrentActivity(message) {
        const element = document.getElementById('currentActivity');
        if (element) {
            element.innerHTML = `<p class="text-lg text-gray-600 typing-animation">${message}</p>`;
        }
    }

    updateOverallProgress(progress) {
        const progressElement = document.getElementById('overallProgress');
        const progressBarElement = document.getElementById('overallProgressBar');
        
        if (progressElement) {
            progressElement.textContent = `${Math.round(progress)}%`;
        }
        
        if (progressBarElement) {
            progressBarElement.style.width = `${progress}%`;
        }
    }

    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('modal').classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    showLoading(message) {
        this.showModal('处理中', `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">${message}</p>
            </div>
        `);
    }

    hideLoading() {
        this.hideModal();
    }

    showError(message) {
        this.showModal('错误', `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <p class="text-red-600">${message}</p>
                <button onclick="app.hideModal()" 
                        class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                    确定
                </button>
            </div>
        `);
    }

    showSuccess(message) {
        this.showModal('成功', `
            <div class="text-center py-4">
                <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                <p class="text-green-600">${message}</p>
                <button onclick="app.hideModal()" 
                        class="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                    确定
                </button>
            </div>
        `);
    }

    // 设置管理：加载、应用与打开设置面板
    loadSettings() {
        try {
            const raw = localStorage.getItem('novelGeneratorSettings');
            if (raw) this.settings = JSON.parse(raw);
        } catch (_) {}
        if (!this.settings) this.settings = { apiProvider: 'deepseek', apiKey: '' };
    }

    applySettingsToForm() {
        const providerSelect = document.getElementById('apiProvider');
        const apiKeyInput = document.getElementById('apiKey');
        if (providerSelect && this.settings?.apiProvider) {
            providerSelect.value = this.settings.apiProvider;
            if (typeof toggleApiKeyInput === 'function') toggleApiKeyInput();
        }
        if (apiKeyInput && this.settings?.apiKey) {
            apiKeyInput.value = this.settings.apiKey;
        }
    }

    openSettings() {
        const current = this.settings || { apiProvider: 'deepseek', apiKey: '' };
        const content = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">AI服务提供商</label>
                    <select id="settingsApiProvider" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="deepseek">DeepSeek (推荐)</option>
                        <option value="openai">GPT / OpenAI</option>
                        <option value="kimi">Kimi</option>
                        <option value="qwen">Qwen</option>
                        <option value="gemini">Gemini</option>
                    </select>
                    <p id="settingsApiHint" class="text-xs text-gray-500 mt-1">选择用于生成小说内容的AI服务</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <div class="relative">
                        <input type="password" id="settingsApiKey" class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入您的API Key">
                        <button type="button" id="settingsApiKeyToggle" class="absolute inset-y-0 right-0 pr-3 flex items中心 text-gray-400 hover:text-gray-600">
                            <i id="settingsApiKeyToggleIcon" class="fas fa-eye"></i>
                        </button>
                    </div>
                    <p id="settingsApiLink" class="text-xs text-gray-500 mt-1"></p>
                </div>
                <div class="flex space-x-4">
                    <button id="saveSettingsBtn" class="flex-1 gradient-bg text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                        <i class="fas fa-save mr-2"></i>保存
                    </button>
                    <button id="cancelSettingsBtn" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors">
                        <i class="fas fa-times mr-2"></i>取消
                    </button>
                </div>
            </div>
        `;
        this.showModal('设置', content);

        const providerSelect = document.getElementById('settingsApiProvider');
        const keyInput = document.getElementById('settingsApiKey');
        providerSelect.value = current.apiProvider || 'deepseek';
        keyInput.value = current.apiKey || '';

        const updateSettingsKeyUI = () => {
            const provider = providerSelect.value;
            const mapping = {
                deepseek: { link: '<a href="https://platform.deepseek.com/api_keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取DeepSeek API Key →</a>' },
                openai: { link: '<a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取OpenAI API Key →</a>' },
                kimi: { link: '<a href="https://platform.moonshot.cn/api-keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取Kimi API Key →</a>' },
                qwen: { link: '<a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" class="text-blue-500 hover:text-blue-700">获取Qwen API Key →</a>' },
                gemini: { link: '<a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-500 hover:text-blue-700">获取Gemini API Key →</a>' }
            };
            document.getElementById('settingsApiLink').innerHTML = (mapping[provider] || mapping.deepseek).link;
        };
        updateSettingsKeyUI();
        providerSelect.addEventListener('change', updateSettingsKeyUI);

        document.getElementById('settingsApiKeyToggle').addEventListener('click', () => {
            const icon = document.getElementById('settingsApiKeyToggleIcon');
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                keyInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.settings = {
                apiProvider: providerSelect.value,
                apiKey: keyInput.value.trim()
            };
            try { localStorage.setItem('novelGeneratorSettings', JSON.stringify(this.settings)); } catch (_) {}
            this.applySettingsToForm();
            this.showSuccess('设置已保存');
            this.hideModal();
        });

        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.hideModal();
        });
    }
}

// API Key 相关辅助函数
function toggleApiKeyInput() {
    const apiProvider = document.getElementById('apiProvider').value;
    const apiKeyLabel = document.getElementById('apiKeyLabel');
    const apiKeyHint = document.getElementById('apiKeyHint');
    const apiKeyLink = document.getElementById('apiKeyLink');
    const providerConfig = {
        deepseek: {
            label: 'DeepSeek API Key',
            hint: '您的DeepSeek API Key将用于生成内容，不会被存储',
            link: '<a href="https://platform.deepseek.com/api_keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取DeepSeek API Key →</a>'
        },
        openai: {
            label: 'OpenAI API Key',
            hint: '您的OpenAI API Key将用于生成内容，不会被存储',
            link: '<a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取OpenAI API Key →</a>'
        },
        kimi: {
            label: 'Kimi API Key',
            hint: '您的Kimi API Key将用于生成内容，不会被存储',
            link: '<a href="https://platform.moonshot.cn/api-keys" target="_blank" class="text-blue-500 hover:text-blue-700">获取Kimi API Key →</a>'
        },
        qwen: {
            label: 'Qwen API Key',
            hint: '您的Qwen API Key将用于生成内容，不会被存储',
            link: '<a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" class="text-blue-500 hover:text-blue-700">获取Qwen API Key →</a>'
        },
        gemini: {
            label: 'Gemini API Key',
            hint: '您的Gemini API Key将用于生成内容，不会被存储',
            link: '<a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-500 hover:text-blue-700">获取Gemini API Key →</a>'
        }
    };

    const cfg = providerConfig[apiProvider] || providerConfig.deepseek;
    apiKeyLabel.textContent = cfg.label;
    apiKeyHint.textContent = cfg.hint;
    apiKeyLink.innerHTML = cfg.link;
}

function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleIcon = document.getElementById('apiKeyToggleIcon');
    
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        apiKeyInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// 初始化应用
const app = new NovelGeneratorApp();