const fs = require('node:fs')
const path = require('node:path')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  storage: {
    setItem (key, value) {
      return new Promise((resolve, reject) => {
        try {
          console.log('[uTools Storage] 准备保存数据:', key, '任务数量:', value ? value.length : 0)
          
          const existingDoc = window.utools.db.get(key)
          
          const data = {
            _id: key,
            value: value,
            updatedAt: Date.now()
          }
          
          if (existingDoc && existingDoc._rev) {
            data._rev = existingDoc._rev
            console.log('[uTools Storage] 更新现有文档, _rev:', existingDoc._rev)
          } else {
            console.log('[uTools Storage] 创建新文档')
          }
          
          const result = window.utools.db.put(data)
          
          if (result.ok) {
            console.log('[uTools Storage] 保存数据成功:', key, '新版本:', result.rev)
            resolve(result)
          } else if (result.error) {
            console.error('[uTools Storage] 保存数据失败:', result.message)
            reject(new Error(result.message))
          }
        } catch (error) {
          console.error('[uTools Storage] 保存数据异常:', error)
          reject(error)
        }
      })
    },
    getItem (key) {
      return new Promise((resolve) => {
        try {
          console.log('[uTools Storage] 准备读取数据:', key)
          const doc = window.utools.db.get(key)
          
          if (doc) {
            console.log('[uTools Storage] 读取数据成功:', key, '任务数量:', doc.value ? doc.value.length : 0, '版本:', doc._rev)
            resolve(doc.value || null)
          } else {
            console.log('[uTools Storage] 读取数据失败或无数据')
            resolve(null)
          }
        } catch (error) {
          console.error('[uTools Storage] 获取数据异常:', error)
          resolve(null)
        }
      })
    },
    removeItem (key) {
      return new Promise((resolve, reject) => {
        try {
          console.log('[uTools Storage] 准备删除数据:', key)
          const doc = window.utools.db.get(key)
          
          if (doc) {
            const result = window.utools.db.remove(doc)
            if (result.ok) {
              console.log('[uTools Storage] 删除数据成功:', key)
              resolve(result)
            } else if (result.error) {
              console.error('[uTools Storage] 删除数据失败:', result.message)
              reject(new Error(result.message))
            }
          } else {
            console.log('[uTools Storage] 删除的数据不存在:', key)
            resolve()
          }
        } catch (error) {
          console.error('[uTools Storage] 删除数据异常:', error)
          reject(error)
        }
      })
    },
    clear () {
      return new Promise((resolve, reject) => {
        try {
          console.log('[uTools Storage] 准备清空所有数据')
          const result = window.utools.db.allDocs({ include_docs: true })
          
          if (result.rows && result.rows.length > 0) {
            result.rows.forEach(row => {
              try {
                window.utools.db.remove(row.doc)
              } catch (err) {
                console.error('[uTools Storage] 删除文档失败:', row.doc._id, err)
              }
            })
          }
          
          console.log('[uTools Storage] 清空数据完成')
          resolve()
        } catch (error) {
          console.error('[uTools Storage] 清空数据异常:', error)
          reject(error)
        }
      })
    }
  }
}
