# CPED 部署指南

## 本地开发

### 启动本地服务器

```bash
cd /Users/liliao/Dropbox/liliaoppa.github.io
python3 -m http.server 8080
```

访问: `http://localhost:8080/funprojects/CPED/`

### 强制刷新（清除缓存）

- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

## GitHub Pages 部署

### 方法1: 直接推送

```bash
git add funprojects/CPED/
git commit -m "Update CPED application"
git push origin gh-pages
```

访问: `https://liliaoppa.github.io/funprojects/CPED/`

### 方法2: 创建测试分支

```bash
# 创建测试分支
git checkout -b cped-test

# 添加修改
git add funprojects/CPED/
git commit -m "CPED refactor"

# 推送到测试分支
git push origin cped-test

# 测试完成后合并到 gh-pages
git checkout gh-pages
git merge cped-test
git push origin gh-pages
```

## 数据架构

```
网站根目录/
├── assets/
│   └── data/
│       └── cped/           # 主数据 (60MB)
│           ├── index.json  # 官员索引 (1.1MB)
│           ├── careers/    # 履历数据
│           ├── timelines/  # 级别时间线
│           └── geo/        # 地理数据
│
└── funprojects/
    └── CPED/               # 应用代码 (728KB)
        ├── index.html
        ├── css/
        ├── js/             # ES Modules
        └── data/
            └── china.json  # 地图数据
```

## 注意事项

1. **必须使用 HTTP 服务器**: ES Modules 不支持 `file://` 协议
2. **数据路径固定**: 主数据始终在 `/assets/data/cped/`，不随应用位置变化
3. **浏览器缓存**: 修改后务必强制刷新
4. **首次加载**: index.json 约 1.1MB，需要 5-30 秒加载时间

## 故障排除

### 404 错误
- 检查是否在网站根目录启动服务器
- 确认 `assets/data/cped/index.json` 存在

### 加载超时
- 检查网络连接
- 增加超时时间（修改 `js/services/dataLoader.js`）

### 模块加载失败
- 确认使用现代浏览器（Chrome/Firefox/Safari/Edge）
- 检查浏览器控制台错误信息
