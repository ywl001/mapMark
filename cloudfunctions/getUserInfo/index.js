// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext();  // 获取当前用户的 OpenID
  
  try {
    // 查询用户信息
    const res = await db.collection('users')  // 假设用户信息保存在 'users' 集合中
                        .where({ openid: openid })  // 根据 OpenID 查询
                        .get();

    // 如果查询结果为空，说明用户信息不存在
    if (res.data.length === 0) {
      return {
        success: false,
        message: '用户信息不存在'
      };
    }

    // 返回查询到的用户信息
    return {
      success: true,
      data: res.data[0]  // 假设每个用户只有一条信息
    };
  } catch (e) {
    // 捕获错误并返回失败信息
    return {
      success: false,
      message: '查询用户信息失败',
      error: e
    };
  }
};
