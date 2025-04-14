// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init();

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, query, data } = event;  // 接收传入的集合名、查询条件和更新数据

  try {
    // 更新数据
    const res = await db.collection(collection)
                        .where(query)  // 使用条件查询
                        .update({
                          data: data  // 更新的数据
                        });

    // 返回更新结果
    if (res.stats.updated > 0) {
      return {
        success: true,
        message: '更新成功'
      };
    } else {
      return {
        success: false,
        message: '没有符合条件的数据，未进行任何更新'
      };
    }
  } catch (e) {
    // 捕获错误并返回失败信息
    return {
      success: false,
      message: '更新数据失败',
      error: e
    };
  }
};
