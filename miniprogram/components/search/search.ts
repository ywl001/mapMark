import db from "../../utils/db";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";

// components/search/search.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    showResults: false, // 是否显示查询结果
    results: [] as any[], // 查询结果数组
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 输入事件
    onInput(e:any) {
      const query = e.detail.value;
      this.setData({
        searchQuery: query
      });
      if (query.length >= 2) {
        this.fetchResults(query);
      } else {
        this.setData({
          results: [],
          showResults: false
        });
      }
    },

    // 获取焦点事件
    onFocus() {
      if (this.data.results.length > 0) {
        this.setData({
          showResults: true
        });
      }
    },

    // 清除搜索框内容
    clearSearch() {
      this.setData({
        searchQuery: '',
        results: [],
        showResults: false
      });
    },

    // 模拟获取查询结果
    fetchResults(keyword:string) {
      const wdb = wx.cloud.database();
      const query = {name: wdb.RegExp({regexp: keyword})}

      db.get("mark", query, 1000).then(res=>{
        console.log(res)
        this.setData({
          results: res,
          showResults: res.length > 0,
        });
      })
    },

    onClickItem(e:any){
      const item = e.currentTarget.dataset.item;
      EventBus.emit(AppEvent.SEARCH_MARKER,item)
      this.setData({
        showResults:false
      })
    }
  }
})