// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init();

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, id } = event;  // 接收传入的集合名和要查询的 ID

  try {
    // 查询数据
    const res = await db.collection(collection)
                        .doc(id)  // 根据文档 ID 查询
                        .get();

    // 返回查询结果
    return {
      success: true,
      data: res.data
    };
  } catch (e) {
    // 捕获错误并返回失败信息
    return {
      success: false,
      message: '查询数据失败',
      error: e
    };
  }
};
