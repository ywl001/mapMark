// cloud functions/deleteFile/index.js
const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const { fileList } = event; // fileList: [fileId1, fileId2, ...]

  try {
    // 直接删除云存储中的文件
    const deleteRes = await cloud.deleteFile({
      fileList: fileList,
    });

    // 检查删除结果
    if (deleteRes.fileList.filter(item => item.status === 'failed').length > 0) {
      throw new Error('部分文件删除失败');
    }

    return {
      success: true,
      message: '文件删除成功',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
