const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async () => {
  try {
    const res = await db.collection('mark') // 替换成你的集合名
      .where({
        type: "camera"
      })
      .update({
        data: {
          createUser: '城关派出所'
        }
      })

    return {
      success: true,
      updated: res.stats.updated
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}
