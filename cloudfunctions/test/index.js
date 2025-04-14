// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 自动匹配当前环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 直接查询 mark 集合的前10条数据（无条件）
    const result = await db.collection('mark').limit(10).get()
    
    return {
      code: 200,
      data: result.data,
      message: `成功查询到 ${result.data.length} 条数据`
    }
  } catch (err) {
    return {
      code: 500,
      message: '查询失败',
      error: err.message // 仅返回错误信息（避免敏感信息泄露）
    }
  }
}