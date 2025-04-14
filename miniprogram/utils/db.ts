interface Query {
  [key: string]: any;
}

interface Data {
  [key: string]: any;
}

class DB {
  private db = wx.cloud.database();

  constructor() {
  }

  // 插入数据
  async add(collection: string, data: Data): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).add({
        data: data
      });
      return res;
    } catch (e) {
      console.error("数据插入失败:", e);
      return null;
    }
  }

  // 查询数据
  async get(collection: string, query: Query = {}, limit: number = 100): Promise<any[]> {
    try {
      const res = await this.db.collection(collection).where(query).limit(limit).get();
      return res.data;
    } catch (e) {
      console.error("数据查询失败:", e);
      return [];
    }
  }

  async getAll(collection: string, query: Query = {}): Promise<any[]> {
    const MAX_LIMIT = 100;
    const countRes = await this.db.collection(collection).where(query).count();
    const total = countRes.total;
  
    const batchTimes = Math.ceil(total / MAX_LIMIT);
    const tasks: Promise<any>[] = [];
  
    for (let i = 0; i < batchTimes; i++) {
      const promise = this.db
        .collection(collection)
        .where(query)
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get();
      tasks.push(promise);
    }
  
    const results = await Promise.all(tasks);
    return results.flatMap(res => res.data);
  }
  

  // 更新数据
  async update(collection: string, query: Query, data: Data): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).where(query).update({
        data: data
      });
      return res;
    } catch (e) {
      console.error("数据更新失败:", e);
      return null;
    }
  }

  // 删除数据
  async delete(collection: string, query: Query): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).where(query).remove();
      return res;
    } catch (e) {
      console.error("数据删除失败:", e);
      return null;
    }
  }

  // 根据ID查询数据
  async getById(collection: string, id: string): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).doc(id).get();
      return res.data;
    } catch (e) {
      console.error("根据ID查询数据失败:", e);
      return null;
    }
  }

  // 根据ID更新数据
  async updateById(collection: string, id: string, data: Data): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).doc(id).update({
        data: data
      });
      return res;
    } catch (e) {
      console.error("根据ID更新数据失败:", e);
      return null;
    }
  }

  // 根据ID删除数据
  async deleteById(collection: string, id: string): Promise<any | null> {
    try {
      const res = await this.db.collection(collection).doc(id).remove();
      return res;
    } catch (e) {
      console.error("根据ID删除数据失败:", e);
      return null;
    }
  }
}

export default new DB();
