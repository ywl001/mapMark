/**
 * 图片处理工具模块
 */

// 定义回调函数类型
type ResizeCallback = (filePath: string | null) => void;

// 定义图片信息的类型（根据 wx.getImageInfo 返回的结构）
interface ImageInfo {
  width: number;
  height: number;
  path: string;
}

/**
 * 调整图片尺寸并压缩
 * @param filePath 图片临时文件路径
 * @param targetSize 目标尺寸（横拍时宽度，竖拍时高度）
 * @param callback 回调函数，接收处理后的文件路径（未处理则返回原路径）
 */
function resizeAndCompressImage(filePath: string, targetSize: number, callback: ResizeCallback): void {
  // 获取图片信息
  wx.getImageInfo({
    src: filePath,
    success: (imageInfo: ImageInfo) => {
      const { width, height } = imageInfo;
      console.log('Original image:', { width, height, filePath });

      if (width <= 0 || height <= 0) {
        console.log('Invalid image dimensions');
        wx.showToast({
          title: '图片尺寸无效',
          icon: 'none'
        });
        callback(null);
        return;
      }

      // 如果图片宽高都小于目标尺寸，直接返回原路径
      if (width <= targetSize && height <= targetSize) {
        console.log('Image smaller than target size, skipping processing');
        callback(filePath);
        return;
      }

      let targetWidth: number, targetHeight: number;
      // 横拍：宽度 > 高度
      if (width > height) {
        // 宽度 > 目标尺寸
        if (width > targetSize) {
          targetWidth = targetSize;
          targetHeight = Math.floor((height * targetWidth) / width);
        } else {
          // 宽度 <= 目标尺寸，跳过处理
          console.log('Width smaller than target size, skipping processing');
          callback(filePath);
          return;
        }
      }
      // 竖拍：宽度 < 高度
      else if (width < height) {
        // 高度 > 目标尺寸
        if (height > targetSize) {
          targetHeight = targetSize;
          targetWidth = Math.floor((width * targetHeight) / height);
        } else {
          // 高度 <= 目标尺寸，跳过处理
          console.log('Height smaller than target size, skipping processing');
          callback(filePath);
          return;
        }
      }
      // 宽度 = 高度
      else {
        // 宽度 > 目标尺寸
        if (width > targetSize) {
          targetWidth = targetSize;
          targetHeight = targetSize;
        } else {
          // 宽度 <= 目标尺寸，跳过处理
          console.log('Image smaller than target size, skipping processing');
          callback(filePath);
          return;
        }
      }

      console.log('Target dimensions:', { targetWidth, targetHeight });

      // 动态设置 Canvas 尺寸
      const canvasWidth: number = targetWidth;
      const canvasHeight: number = targetHeight;

      // 创建 Canvas 上下文
      const ctx: WechatMiniprogram.CanvasContext = wx.createCanvasContext('imageCanvas');
      // 设置背景为白色，防止黑色填充
      ctx.setFillStyle('white');
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      // 打印绘制参数
      console.log('Drawing image:', { x: 0, y: 0, width: canvasWidth, height: canvasHeight });
      // 绘制图片
      ctx.drawImage(filePath, 0, 0, canvasWidth, canvasHeight);
      ctx.draw(false, () => {
        // 导出 Canvas 内容为图片，强制指定输出尺寸和裁剪区域
        wx.canvasToTempFilePath({
          canvasId: 'imageCanvas',
          x: 0, // 裁剪起始点
          y: 0,
          width: canvasWidth, // 裁剪宽度
          height: canvasHeight, // 裁剪高度
          destWidth: targetWidth, // 输出宽度
          destHeight: targetHeight, // 输出高度
          quality: 0.5, // 压缩质量
          fileType: 'jpg', // JPEG 格式
          success: (res: WechatMiniprogram.CanvasToTempFilePathSuccessCallbackResult) => {
            const compressedFilePath: string = res.tempFilePath;
            // 验证输出图片尺寸
            wx.getImageInfo({
              src: compressedFilePath,
              success: (outputInfo: ImageInfo) => {
                console.log('Output image:', {
                  width: outputInfo.width,
                  height: outputInfo.height,
                  filePath: compressedFilePath
                });
                // 检查文件大小
                wx.getFileInfo({
                  filePath: compressedFilePath,
                  success: (fileInfo: WechatMiniprogram.WxGetFileInfoSuccessCallbackResult) => {
                    console.log('Compressed image size:', fileInfo.size / 1024, 'KB');
                    callback(compressedFilePath);
                  },
                  fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
                    console.log('get file info fail', err);
                    callback(compressedFilePath); // 继续回调
                  }
                });
              },
              fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
                console.log('get output image info fail', err);
                callback(compressedFilePath); // 继续回调
              }
            });
          },
          fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
            console.log('canvas to file fail', err);
            wx.showToast({
              title: '图片处理失败，请重试',
              icon: 'none'
            });
            callback(null);
          }
        });
      });
    },
    fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
      console.log('get image info fail', err);
      wx.showToast({
        title: '获取图片信息失败',
        icon: 'none'
      });
      callback(null);
    }
  });
}

export default resizeAndCompressImage;