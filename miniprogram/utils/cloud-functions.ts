// 云函数调用工具类
class CloudFunctions {
  // 调用云函数通用方法
  private async callFunction(name: string, data: object,showLoading: boolean = true) {
    let loadingTimer: any = null;
    try {

      // wx.showLoading({
      //   title: '加载中...',
      //   mask: true, // 遮罩层，防止用户在加载期间点击其他地方
      // });

      if (showLoading) {
        loadingTimer = setTimeout(() => {
          wx.showLoading({
            title: '加载中...',
            mask: true,
          });
        }, 500); // 延迟 500ms 显示 loading
      }

      // console.log(data)
      const result = await wx.cloud.callFunction({
        name: name,  // 云函数名称
        data: data   // 云函数传递的参数
      });

      // wx.hideLoading(); // 隐藏加载提示
      // console.log(result)
      return result.result;
    } catch (error) {
      console.error(`云函数 ${name} 调用失败`, error);
      return { success: false, message: '云函数调用失败', error };
    } finally {
      // 延迟后隐藏 loading
      if (loadingTimer) {
        clearTimeout(loadingTimer); // 清除定时器
      }
      wx.hideLoading();
    }
  }

  // 调用添加数据的云函数
  async addData(collection: string, data: object) {
    const result = await this.callFunction('add', { collection, data });
    return result;
  }

  // 调用根据ID获取数据的云函数
  async getDataById(collection: string, id: string) {
    const result = await this.callFunction('getById', { collection, id });
    return result;
  }

  // 调用根据查询条件获取数据的云函数
  async getData(collection: string, query: object = {}, limit: number = 200) {
    const result = await this.callFunction('get', { collection, query, limit });
    return result;
  }

  // 调用删除数据的云函数
  async deleteData(collection: string, query: object) {
    const result = await this.callFunction('delete', { collection, query });
    return result;
  }

  // 调用根据ID删除数据的云函数
  async deleteDataById(collection: string, id: string) {
    const result = await this.callFunction('deleteById', { collection, id });
    return result;
  }

  // 调用更新数据的云函数
  async updateData(collection: string, query: object, data: object) {
    const result = await this.callFunction('update', { collection, query, data });
    return result;
  }

  // 调用根据ID更新数据的云函数
  async updateDataById(collection: string, id: string, data: object) {
    const result = await this.callFunction('updateById', { collection, id, data });
    return result;
  }

  // 调用根据ID更新数据的云函数
  async countByCreateUser(collection: string, type: string) {
    const result = await this.callFunction('countByCreateUser', { collection, type });
    return result;
  }
}

// 实例化工具类
const cloudFunctions = new CloudFunctions();

export default cloudFunctions;
