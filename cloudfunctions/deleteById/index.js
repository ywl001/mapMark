// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, id } = event;  // 接收传入的集合名和要删除的 ID

  try {
    // 删除数据
    const res = await db.collection(collection)
                        .doc(id)  // 根据文档 ID 删除
                        .remove();

    // 返回删除结果
    if (res.stats.removed === 1) {
      return {
        success: true,
        message: '删除成功'
      };
    } else {
      return {
        success: false,
        message: '没有找到要删除的数据'
      };
    }
  } catch (e) {
    // 捕获错误并返回失败信息
    return {
      success: false,
      message: '删除数据失败',
      error: e
    };
  }
};
