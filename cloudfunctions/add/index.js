// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, data } = event;  // 接收传入的集合名和要添加的数据

  try {
    // 将数据添加到指定的集合
    const res = await db.collection(collection).add({
      data: data
    });

    // 返回添加成功的信息
    return {
      success: true,
      _id: res._id  // 返回新添加的文档 ID
    };
  } catch (e) {
    // 捕获错误并返回失败信息
    return {
      success: false,
      message: '添加数据失败',
      error: e
    };
  }
};
