# Docker 故障排查指南 / Docker Troubleshooting Guide

## 常见问题 / Common Issues

### 1. 网络连接失败 / Network Connection Failed

**错误信息**:
```
failed to fetch anonymous token: dial tcp: connectex: A connection attempt failed
```

**原因 / Cause**:
- 无法连接到 Docker Hub
- 防火墙/代理阻止
- DNS 解析问题

**解决方案 / Solutions**:

#### 方案 A: 使用国内镜像源 (推荐)
在 Docker Desktop 设置中配置镜像加速器：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

#### 方案 B: 使用代理
```bash
# Windows PowerShell
$env:HTTP_PROXY="http://proxy-server:port"
$env:HTTPS_PROXY="http://proxy-server:port"

# Linux/Mac
export HTTP_PROXY=http://proxy-server:port
export HTTPS_PROXY=http://proxy-server:port
```

#### 方案 C: 手动拉取镜像
```bash
docker pull node:24-alpine
docker-compose build
```

### 2. node_modules 文件权限错误 / File Permission Error

**错误信息**:
```
failed to checksum file node_modules/...: unknown file mode
```

**原因 / Cause**:
- Windows 和 Linux 文件权限不兼容
- node_modules 被复制到 Docker 构建上下文

**解决方案 / Solution**:
✅ 已修复 - `.dockerignore` 文件已创建，排除 `node_modules`

### 3. 构建上下文过大 / Build Context Too Large

**错误信息**:
```
transferring context: 547.97MB
```

**原因 / Cause**:
- node_modules 被包含在构建上下文中
- 数据文件或日志文件被包含

**解决方案 / Solution**:
✅ 已修复 - `.dockerignore` 排除了不必要的文件

### 4. better-sqlite3 编译失败 / Compilation Failed

**错误信息**:
```
gyp ERR! find VS: Could not find Visual Studio installation
```

**原因 / Cause**:
- Windows 上缺少 Visual Studio Build Tools
- Node 版本与预编译二进制不匹配

**解决方案 / Solution**:
✅ 使用 Docker - Alpine Linux 容器内会自动编译

## 验证 Docker 构建 / Verify Docker Build

### 步骤 1: 清理旧构建
```bash
docker-compose down
docker system prune -a
```

### 步骤 2: 重新构建
```bash
docker-compose build --no-cache
```

### 步骤 3: 启动容器
```bash
docker-compose up -d
```

### 步骤 4: 查看日志
```bash
docker-compose logs -f
```

### 步骤 5: 验证运行
```bash
# 检查容器状态
docker-compose ps

# 访问应用
curl http://localhost:8080
```

## 性能优化 / Performance Optimization

### 多阶段构建优化
当前 Dockerfile 已使用多阶段构建：
- **Stage 1 (builder)**: 安装依赖 + 构建应用
- **Stage 2 (runtime)**: 仅包含运行时文件

### 减少镜像大小
```dockerfile
# 使用 Alpine Linux (已采用)
FROM node:24-alpine

# 清理 npm 缓存
RUN npm cache clean --force

# 仅安装生产依赖
RUN npm install --production
```

### 构建缓存优化
```dockerfile
# 先复制 package.json (利用缓存)
COPY package*.json ./
RUN npm install

# 再复制源代码
COPY . .
```

## 生产部署建议 / Production Deployment

### 1. 使用环境变量文件
```bash
# 创建 .env.production
cp .env.example .env.production

# 编辑配置
nano .env.production
```

### 2. 配置 docker-compose.override.yml
```yaml
version: "3.8"
services:
  app:
    environment:
      - NODE_ENV=production
      - SECRET_ENCRYPTION_KEY=${SECRET_ENCRYPTION_KEY}
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. 使用 Docker Secrets (推荐)
```yaml
services:
  app:
    secrets:
      - secret_encryption_key
    environment:
      - SECRET_ENCRYPTION_KEY_FILE=/run/secrets/secret_encryption_key

secrets:
  secret_encryption_key:
    file: ./secrets/secret_encryption_key.txt
```

### 4. 健康检查
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 5. 资源限制
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 故障排查命令 / Troubleshooting Commands

```bash
# 查看容器日志
docker-compose logs app

# 进入容器 shell
docker-compose exec app sh

# 检查数据库
docker-compose exec app ls -la /app/data

# 重启容器
docker-compose restart app

# 完全重建
docker-compose down -v
docker-compose up -d --build

# 查看资源使用
docker stats dombeacon
```

## 常见问题解答 / FAQ

**Q: 为什么使用 Alpine Linux?**
A: Alpine 镜像体积小（~5MB），安全性高，适合生产环境。

**Q: 数据会丢失吗?**
A: 不会。`./data` 目录通过 volume 挂载，数据持久化在宿主机。

**Q: 如何备份数据?**
A: 
```bash
# 备份数据库
cp data/app.db data/app.db.backup

# 或使用 Docker volume
docker run --rm -v dombeacon_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

**Q: 如何更新应用?**
A:
```bash
git pull
docker-compose down
docker-compose up -d --build
```

**Q: 端口冲突怎么办?**
A: 修改 docker-compose.yml 中的端口映射：
```yaml
ports:
  - "8080:3000"  # 使用 8080 代替 3000
```
