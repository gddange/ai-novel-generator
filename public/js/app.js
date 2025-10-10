class NovelGeneratorApp {
    constructor() {
        this.currentProject = null;
        this.agents = {
            author: { status: 'idle', progress: 0 },
            outline: { status: 'idle', progress: 0 },
            polish: { status: 'idle', progress: 0 }
        };
        this.chapters = [];
        this.isGenerating = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
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

        // 项目表单
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

    async createNewProject() {
        const formData = new FormData(document.getElementById('newProjectForm'));
        const projectData = {
            title: formData.get('title'),
            genre: formData.get('genre'),
            description: formData.get('theme')
        };

        try {
            this.showLoading('正在创建项目...');
            
            const response = await fetch('/api/novels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentProject = result.data;
                this.showProgressSection();
                this.startNovelGeneration();
            } else {
                this.showError(result.error || '项目创建失败');
            }
        } catch (error) {
            console.error('创建项目失败:', error);
            this.showError('创建项目时发生错误');
        } finally {
            this.hideLoading();
        }
    }

    async startNovelGeneration() {
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        this.updateCurrentActivity('开始规划小说大纲...');

        try {
            // 第一阶段：规划大纲
            await this.executePlanningPhase();
            
            // 第二阶段：开始写作循环
            await this.executeWritingLoop();
            
        } catch (error) {
            console.error('小说生成过程出错:', error);
            this.showError('生成过程中发生错误: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async executePlanningPhase() {
        this.updateAgentStatus('outline', 'working', 20, '正在分析主题...');
        this.updateAgentStatus('author', 'working', 10, '准备创作思路...');
        
        const response = await fetch(`/api/agents/${this.currentProject.id}/planning`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.updateAgentStatus('outline', 'completed', 100, '大纲规划完成');
            this.updateAgentStatus('author', 'ready', 30, '准备开始写作');
            this.updateCurrentActivity('大纲规划完成，开始创作第一章...');
            this.updateOverallProgress(25);
        } else {
            throw new Error(result.error || '大纲规划失败');
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
        
        const response = await fetch(`/api/agents/${this.currentProject.id}/writing`, {
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
        
        const response = await fetch(`/api/agents/${this.currentProject.id}/polishing`, {
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
        if (!this.currentProject) return;
        
        try {
            const response = await fetch(`/api/novels/${this.currentProject.id}/chapters`);
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
            const response = await fetch(`/api/novels/${this.currentProject.id}/chapters/${chapterNumber}`);
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
        if (!this.currentProject) {
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
            const response = await fetch(`/api/novels/${this.currentProject.id}/export/${format}`);
            
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
        if (!this.currentProject) {
            this.showError('请先创建或选择一个项目');
            return;
        }
        
        try {
            const response = await fetch(`/api/novels/${this.currentProject.id}/full`);
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
            const response = await fetch(`/api/agents/${projectId}/load`);
            const result = await response.json();
            
            if (result.success) {
                this.currentProject = result.data;
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
}

// 初始化应用
const app = new NovelGeneratorApp();