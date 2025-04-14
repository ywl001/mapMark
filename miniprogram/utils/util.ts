export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

/**确认框 */
export const alertTool = (title:string, content:string) => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: title || '删除警告', // 默认标题为 '删除警告'
      content: content || '确定要删除该警务室吗？', // 默认内容
      showCancel: true,
      cancelText: '取消',
      confirmText: '确定',
      success(res) {
        if (res.confirm) {
          // 用户点击了确认按钮，返回 resolve
          console.log('用户确认删除');
          resolve(true); // resolve 表示确认删除
        } else if (res.cancel) {
          // 用户点击了取消按钮，返回 reject
          console.log('用户取消删除');
          reject(false); // reject 表示取消删除
        }
      },
      fail(error) {
        // 如果弹框失败，返回 reject
        reject(error);
      }
    });
  });
}

/**对比新旧数据，返回修改的数据，用于提交update时 */
export const getChangeData = (originalData:any, newData:any) => {
  const modifiedFields:any = {};

  Object.keys(newData).forEach((key) => {
    const originalValue = originalData[key];
    const newValue = newData[key];
    // 判断是否是对象（排除 null 和数组）
    if (
      typeof originalValue === "object" &&
      originalValue !== null &&
      !Array.isArray(originalValue) &&
      typeof newValue === "object" &&
      newValue !== null &&
      !Array.isArray(newValue)
    ) {
      // 递归处理嵌套对象
      const nestedModifiedFields:any = getChangeData(originalValue, newValue);

      if (Object.keys(nestedModifiedFields).length > 0) {
        modifiedFields[key] = nestedModifiedFields;
      }
    } else if (originalValue !== newValue) {
      // 直接比较非对象类型
      modifiedFields[key] = newValue;
    }
  });
  return modifiedFields;
}
