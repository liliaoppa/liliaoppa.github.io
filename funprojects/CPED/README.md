# CPED 官员生涯追踪系统

## 快速开始

### 重要：必须使用本地服务器访问

由于浏览器安全限制（CORS + ES Modules），**不能直接双击打开 HTML 文件**。

### 启动本地服务器

```bash
# 方法1: 使用 Node.js 的 serve
npx serve -l 3000

# 方法2: 使用 Python 3
python3 -m http.server 3000

# 方法3: 使用 PHP
php -S localhost:3000
```

然后访问: `http://localhost:3000/funprojects/CPED/`

### 数据加载说明

本应用采用**纯前端架构**，无需后端服务器：

1. **首次加载**: 下载 `index.json` (~1.1MB)，包含所有官员基本信息
2. **搜索/浏览**: 在本地处理，无需网络请求
3. **查看详情**: 按需加载单个官员的详细数据 (~3-5KB)

### 项目结构

```
CPED/
├── index.html          # 应用入口
├── css/                # 样式文件
├── js/                 # ES Module 代码
│   ├── components/     # UI 组件
│   ├── services/       # 数据服务
│   └── utils/          # 工具函数
└── data/
    └── china.json      # 地图数据

# 主数据位于上级目录:
assets/data/cped/
├── index.json          # 官员索引
├── careers/            # 履历数据 (3923个文件)
├── timelines/          # 级别时间线 (3923个文件)
└── geo/                # 地理数据 (3923个文件)
```

### 调试

打开浏览器开发者工具（F12），查看 Console 日志：

```
[DataLoader] Loading index from: https://.../assets/data/cped/index.json
[DataLoader] Index loaded: 3923 officials
```

### GitHub Pages 部署

推送到 gh-pages 分支即可自动部署：

```bash
git add .
git commit -m "Update CPED"
git push origin gh-pages
```

访问: `https://liliaoppa.github.io/funprojects/CPED/`
