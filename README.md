# 智能拖拽看板 - uTools 插件

一个基于 Vue.js 开发的智能拖拽看板应用，作为 uTools 插件运行。支持任务管理、拖拽排序、数据持久化等功能。

## 功能特性

- **任务管理**：创建、编辑、删除任务
- **智能拖拽**：支持任务在不同列之间拖拽，带有磁吸效果
- **优先级管理**：支持高、中、低三种优先级，用不同颜色标识
- **数据持久化**：使用 uTools 本地数据库存储，重启 uTools 后数据依然存在
- **响应式设计**：简洁美观的界面，良好的用户体验
- **日期显示**：智能显示任务创建时间（今天、昨天、X天前）

## 技术栈

- **Vue.js 3**：渐进式 JavaScript 框架
- **Vite**：新一代前端构建工具
- **uTools API**：uTools 插件开发接口
- **uTools 本地数据库**：基于 NoSQL 的本地数据存储

## 安装和运行

### 环境要求

- Node.js >= 16.0.0
- uTools >= 3.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后，在 uTools 中配置开发模式，访问 `http://127.0.0.1:3000`

### 构建生产版本

```bash
npm run build
```

构建完成后，将 `dist` 目录中的文件复制到 uTools 插件目录。

## 项目结构

```
aaa/
├── public/                 # 静态资源
│   ├── preload/           # 预加载脚本
│   │   ├── services.js    # uTools 服务封装（文件读写、数据库存储）
│   │   └── package.json   # 预加载脚本依赖
│   ├── logo.png           # 插件图标
│   └── plugin.json        # uTools 插件配置
├── src/                   # 源代码
│   ├── App.vue           # 主应用组件
│   └── main.js           # 应用入口
├── index.html            # HTML 模板
├── vite.config.js        # Vite 配置
├── package.json          # 项目依赖
└── README.md            # 项目文档
```

## 数据持久化

本项目使用 uTools 本地数据库实现数据持久化，关键实现：

### 数据库操作

数据存储在 `public/preload/services.js` 中，封装了以下操作：

- **setItem(key, value)**：保存数据，自动处理文档版本号 `_rev`
- **getItem(key)**：读取数据
- **removeItem(key)**：删除数据
- **clear()**：清空所有数据

### 文档版本管理

根据 uTools 数据库规范，更新文档时必须包含 `_rev` 字段：

```javascript
// 保存数据前先获取现有文档
const existingDoc = window.utools.db.get(key)

// 如果文档存在，包含 _rev 字段
if (existingDoc && existingDoc._rev) {
  data._rev = existingDoc._rev
}

// 保存数据
const result = window.utools.db.put(data)
```

### 数据结构

任务数据存储在 `kanban-tasks` 文档中：

```javascript
{
  _id: "kanban-tasks",
  _rev: "1-xxx",
  value: [
    {
      id: "任务ID",
      title: "任务标题",
      description: "任务描述",
      priority: "high",  // high/medium/low
      column: "todo",    // todo/doing/done
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  updatedAt: 1234567890000
}
```

## 使用说明

### 在 uTools 中使用

1. **安装插件**
   - 将项目构建后的文件放入 uTools 插件目录
   - 在 uTools 中搜索"看板"、"kanban"或"任务管理"

2. **添加任务**
   - 点击右上角"+ 添加任务"按钮
   - 填写任务标题（必填）、描述（可选）
   - 选择优先级和所属列
   - 点击"保存"

3. **拖拽任务**
   - 按住任务卡片拖拽到目标列
   - 松开鼠标完成移动
   - 目标列会有磁吸动画效果

4. **编辑任务**
   - 点击任务卡片打开编辑窗口
   - 修改任务信息后保存

5. **删除任务**
   - 点击任务卡片右上角的"×"按钮
   - 确认删除

### 开发调试

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **配置 uTools 开发模式**
   - 在 `plugin.json` 中已配置开发模式入口：`http://127.0.0.1:3000`
   - 在 uTools 开发者工具中重新加载插件

3. **查看日志**
   - 打开 uTools 开发者工具（F12）
   - 查看 Console 标签中的日志输出
   - 日志前缀：
     - `[App]`：应用层日志
     - `[uTools Storage]`：数据库操作日志

## 插件配置

`plugin.json` 配置说明：

```json
{
  "main": "index.html",           // 生产环境入口
  "preload": "preload/services.js", // 预加载脚本
  "logo": "logo.png",              // 插件图标
  "development": {
    "main": "http://127.0.0.1:3000" // 开发环境入口
  },
  "features": [                    // 功能入口
    {
      "code": "kanban",
      "explain": "看板任务管理应用",
      "cmds": ["看板", "kanban", "任务管理"]
    }
  ]
}
```

## 注意事项

1. **数据同步**：如果用户开启 uTools 数据同步，数据会备份到 uTools 服务端，可在多设备间同步
2. **文档冲突**：多个设备同时编辑同一文档时会产生冲突，数据库会统一选择一个版本
3. **数据大小**：单个文档大小不超过 1MB
4. **开发环境**：开发模式下使用 localStorage，生产环境使用 uTools 数据库

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
