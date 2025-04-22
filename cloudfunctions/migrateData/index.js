// 云函数 migrateGunCamera
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async () => {
  try {
    await db.createCollection('camera_image')
  } catch (e) {
    console.log('集合已存在或创建失败', e)
  }
  const sourceCollection = db.collection('mark')
  const targetCollection = db.collection('camera_image')
  // 查询所有 cameraType = '枪机' 的记录（最多一次100条，分页）
  const MAX_LIMIT = 100
  let total = await sourceCollection.where({ cameraType: '枪机' }).count()
  let allData = []

  for (let i = 0; i < Math.ceil(total.total / MAX_LIMIT); i++) {
    let res = await sourceCollection
      .where({ cameraType: '枪机' })
      .skip(i * MAX_LIMIT)
      .limit(MAX_LIMIT)
      .get()
    allData = allData.concat(res.data)
  }

  // 批量写入到 camera_gun（注意：不能用 addAll，要一个个 add）
  const insertTasks = allData.map(item => {
    // 可根据需要处理字段（比如删掉 cameraType）
    const { _id, cameraType, ...rest } = item
    return targetCollection.add({ data: rest })
  })

  await Promise.all(insertTasks)
  return {
    message: `已成功迁移 ${allData.length} 条枪机数据`,
  }
}
