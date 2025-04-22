// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, type } = event;
  try {
    const result = await db.collection(collection)  // 替换成你的集合名
      .aggregate()
      .match({
        type: type 
      })
      .group({
        _id: '$createUser',   // 按 createUser 字段分组
        count: db.command.aggregate.sum(1)  // 统计每个分组的数量
      })
      .sort({
        count: -1  // 按计数降序排序
      })
      .end()

    return result
  } catch (err) {
    console.error(err)
    return {
      error: err
    }
  }
}