// 云函数代码
const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { collection, query, limit = 200 } = event;  // 设置默认的查询条数为200

  try {
    // 执行数据库查询
    const res = await db.collection(collection)
      .where(query)      // 使用传入的查询条件
      .limit(limit)      // 限制返回数量
      .get();            // 执行查询操作
    
    console.log('查询结果:', res.data);  // 打印查询结果到日志中
    return res.data;  // 返回查询到的数据
  } catch (e) {
    console.error('数据查询失败:', e);
    return { success: false, message: '数据查询失败', error: e };  // 如果查询失败，返回错误信息
  }
};
