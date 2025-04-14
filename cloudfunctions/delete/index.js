// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init();

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, query } = event;  // 接收传入的集合名和删除条件

  try {
    // 删除数据
    const res = await db.collection(collection)
                        .where(query)  // 使用条件删除数据
                        .remove();

    // 返回删除结果
    if (res.stats.removed > 0) {
      return {
        success: true,
        message: '删除成功'
      };
    } else {
      return {
        success: false,
        message: '没有找到符合条件的数据'
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
