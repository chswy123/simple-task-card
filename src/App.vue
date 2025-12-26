<template>
  <div class="app">
    <div class="header">
      <h1>任务看板</h1>
      <p></p>
      <div class="header-actions">
        <select v-model="currentTheme" @change="changeTheme" class="theme-selector">
          <option value="black-gold">黑金主题</option>
          <option value="github-light">GitHub 亮色</option>
          <option value="github-dark">GitHub 暗色</option>
        </select>
        <button class="header-add-btn" @click="openTaskModal('todo')">
          + 添加任务
        </button>
      </div>
    </div>
    
    <div class="kanban-board">
      <div 
        v-for="column in columns" 
        :key="column.key"
        class="column"
        :class="{ 'drag-over': column.dragOver }"
        @dragover="handleDragOver($event, column)"
        @drop="handleDrop($event, column)"
        @dragleave="handleDragLeave(column)"
      >
        <div class="column-header">
          <div class="column-title">
            <span>{{ column.icon }}</span>
            <span>{{ column.title }}</span>
            <span class="column-count">{{ getTaskCount(column.key) }}</span>
          </div>
        </div>
        
        <div class="task-list">
          <div 
            v-for="task in getTasksByColumn(column.key)" 
            :key="task.id"
            class="task-item"
            :class="{ 
              'dragging': draggedTask && draggedTask.id === task.id,
              'drop-target': column.dragOver 
            }"
            :style="{ 
              borderLeftColor: getPriorityColor(task.priority),
              transform: draggedTask && draggedTask.id === task.id ? 'rotate(5deg)' : 'none'
            }"
            draggable="true"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @click="editTask(task)"
          >
            <button class="task-delete-btn" @click.stop="deleteTaskDirect(task)">×</button>
            <div class="task-title">{{ task.title }}</div>
            <div class="task-description" v-if="task.description">{{ task.description }}</div>
            <div class="task-meta">
              <span :class="['task-priority', `priority-${task.priority}`]">
                {{ getPriorityText(task.priority) }}
              </span>
              <span>{{ formatDate(task.createdAt) }}</span>
            </div>
          </div>
          
          <div v-if="getTasksByColumn(column.key).length === 0" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div>暂无任务</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务模态框 -->
    <div v-if="showTaskModal" class="modal" @click="closeTaskModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editingTask ? '编辑任务' : '添加任务' }}
          </h3>
          <button class="close-btn" @click="closeTaskModal">×</button>
        </div>
        
        <form @submit.prevent="saveTask">
          <div class="form-group">
            <label class="form-label">任务标题 *</label>
            <input 
              v-model="taskForm.title" 
              type="text" 
              class="form-input"
              placeholder="请输入任务标题"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">任务描述</label>
            <textarea 
              v-model="taskForm.description" 
              class="form-input form-textarea"
              placeholder="请输入任务描述"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">优先级</label>
            <select v-model="taskForm.priority" class="form-input form-select">
              <option value="low">🟢 低</option>
              <option value="medium">🟡 中</option>
              <option value="high">🔴 高</option>
            </select>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeTaskModal">
              取消
            </button>
            <button v-if="editingTask" type="button" class="btn btn-danger" @click="deleteTask">
              删除
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingTask ? '更新任务' : '添加任务' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteModal" class="modal" @click="cancelDeleteTask">
      <div class="modal-content modal-delete" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">确认删除</h3>
          <button class="close-btn" @click="cancelDeleteTask">×</button>
        </div>
        
        <div class="delete-confirm-content">
          <div class="delete-icon">⚠️</div>
          <p class="delete-message">确定要删除这个任务吗？</p>
          <p class="delete-warning">此操作不可恢复</p>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="cancelDeleteTask">
            取消
          </button>
          <button type="button" class="btn btn-danger" @click="confirmDeleteTask">
            确认删除
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'

// 存储服务兼容层
const storageService = {
  async setItem(key, value) {
    if (window.services && window.services.storage) {
      return window.services.storage.setItem(key, JSON.parse(JSON.stringify(value)))
    } else {
      localStorage.setItem(key, JSON.stringify(value))
      return Promise.resolve()
    }
  },
  async getItem(key) {
    if (window.services && window.services.storage) {
      return window.services.storage.getItem(key)
    } else {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    }
  }
}

// 主题相关
const currentTheme = ref('black-gold')

// 切换主题
const changeTheme = async () => {
  document.documentElement.setAttribute('data-theme', currentTheme.value)
  await storageService.setItem('kanban-theme', currentTheme.value)
}

// 初始化主题
const initializeTheme = async () => {
  const savedTheme = await storageService.getItem('kanban-theme')
  if (savedTheme) {
    currentTheme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
}

// 列定义
const columns = ref([
  { key: 'todo', title: '待办', icon: '📝', dragOver: false },
  { key: 'doing', title: '进行中', icon: '⚡', dragOver: false },
  { key: 'done', title: '已完成', icon: '✅', dragOver: false }
])

// 任务数据
const tasks = ref([])

// 拖拽相关
const draggedTask = ref(null)

// 模态框状态
const showTaskModal = ref(false)
const showDeleteModal = ref(false)
const editingTask = ref(null)
const taskForm = reactive({
  title: '',
  description: '',
  priority: 'medium',
  column: 'todo'
})



// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 初始化数据
const initializeData = async () => {
  const savedTasks = await storageService.getItem('kanban-tasks')
  if (savedTasks) {
    tasks.value = savedTasks
  } else {
    // 默认示例任务
    tasks.value = [
      {
        id: generateId(),
        title: '欢迎使用智能拖拽看板',
        description: '这是一个示例任务，您可以编辑或删除它。尝试拖拽任务到不同的列中吧！',
        priority: 'high',
        column: 'todo',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: '智能拖拽体验',
        description: '试试将这个任务拖拽到"进行中"列，体验磁吸效果',
        priority: 'medium',
        column: 'doing',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: '数据持久化',
        description: '所有操作都会自动保存到uTools数据库中，重启uTools后数据依然存在',
        priority: 'low',
        column: 'done',
        createdAt: new Date().toISOString()
      }
    ]
  }
  await saveData()
}

// 保存数据到uTools数据库
const saveData = async () => {
  await storageService.setItem('kanban-tasks', tasks.value)
}

// 获取指定列的任务
const getTasksByColumn = (column) => {
  return tasks.value.filter(task => task.column === column)
}

// 获取任务数量
const getTaskCount = (column) => {
  return getTasksByColumn(column).length
}

// 获取优先级颜色
const getPriorityColor = (priority) => {
  const colors = {
    high: '#f44336',
    medium: '#ff9800',
    low: '#4CAF50'
  }
  return colors[priority] || '#667eea'
}

// 获取优先级文本
const getPriorityText = (priority) => {
  const texts = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return texts[priority] || '普通'
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays - 1}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 拖拽开始
const handleDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
}

// 拖拽结束
const handleDragEnd = (event) => {
  event.target.classList.remove('dragging')
  draggedTask.value = null
  columns.value.forEach(column => column.dragOver = false)
}

// 拖拽悬停
const handleDragOver = (event, column) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  column.dragOver = true
}

// 拖拽离开
const handleDragLeave = (column) => {
  column.dragOver = false
}

// 拖拽放置
const handleDrop = async (event, targetColumn) => {
  event.preventDefault()
  
  if (draggedTask.value) {
    const fromColumn = draggedTask.value.column
    const toColumn = targetColumn.key
    const wasMoved = fromColumn !== toColumn
    
    if (wasMoved) {
      // 更新任务列
      const taskIndex = tasks.value.findIndex(t => t.id === draggedTask.value.id)
      if (taskIndex !== -1) {
        tasks.value[taskIndex].column = toColumn
        await saveData()
        
        // 添加磁吸效果动画
        const columnElement = event.currentTarget
        columnElement.style.transform = 'scale(1.05)'
        setTimeout(() => {
          columnElement.style.transform = ''
        }, 200)
      }
    }
  }
  
  // 清除拖拽状态
  draggedTask.value = null
  columns.value.forEach(column => column.dragOver = false)
}

// 打开任务模态框
const openTaskModal = (column = 'todo', task = null) => {
  if (task) {
    // 编辑模式
    editingTask.value = task
    taskForm.title = task.title
    taskForm.description = task.description
    taskForm.priority = task.priority
    taskForm.column = task.column
  } else {
    // 新建模式
    editingTask.value = null
    taskForm.title = ''
    taskForm.description = ''
    taskForm.priority = 'medium'
    taskForm.column = column
  }
  showTaskModal.value = true
}

// 关闭任务模态框
const closeTaskModal = () => {
  showTaskModal.value = false
  editingTask.value = null
}

// 保存任务
const saveTask = async () => {
  if (!taskForm.title.trim()) return
  
  if (editingTask.value) {
    // 更新任务
    const taskIndex = tasks.value.findIndex(t => t.id === editingTask.value.id)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        column: taskForm.column
      }
    }
  } else {
    // 创建新任务
    const newTask = {
      id: generateId(),
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      column: taskForm.column,
      createdAt: new Date().toISOString()
    }
    tasks.value.push(newTask)
  }
  
  await saveData()
  closeTaskModal()
}

// 编辑任务
const editTask = (task) => {
  openTaskModal(task.column, task)
}

// 直接删除任务（从卡片上点击删除按钮）
const deleteTaskDirect = (task) => {
  editingTask.value = task
  showDeleteModal.value = true
}

// 删除任务
const deleteTask = () => {
  showDeleteModal.value = true
}

// 确认删除任务
const confirmDeleteTask = async () => {
  if (editingTask.value) {
    const taskIndex = tasks.value.findIndex(t => t.id === editingTask.value.id)
    if (taskIndex !== -1) {
      tasks.value.splice(taskIndex, 1)
      await saveData()
    }
    closeTaskModal()
  }
  showDeleteModal.value = false
  editingTask.value = null
}

// 取消删除任务
const cancelDeleteTask = () => {
  showDeleteModal.value = false
  editingTask.value = null
}

// 组件挂载时初始化数据
onMounted(async () => {
  await initializeTheme()
  initializeData()
})


</script>