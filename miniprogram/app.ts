// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    wx.cloud.init({
      env: 'ywl-mj-3g8u5dnn5bbb7c77',  // 替换为你的小程序云开发环境ID
      traceUser: true,      // 是否追踪用户的访问
    });
  },
})