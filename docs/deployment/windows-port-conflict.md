# 端口冲突解决方案 / Port Conflict Solutions

## 问题 / Issue

```
Ports are not available: listen tcp 0.0.0.0:3000: bind: An attempt was made to access a socket in a way forbidden by its access permissions.
```

## 根本原因 / Root Cause

⚠️ **Windows 动态端口保留问题** - 这不是端口被占用，而是 Windows 将某些端口范围保留给 Hyper-V 和其他系统服务。

### 检查保留端口范围

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**常见保留范围**:
- `2982-3081` (包含 3000, 3001)
- `3104-3203`
- `50000-50059`

这就是为什么 3000 和 3001 都不可用的原因！

## 解决方案 / Solutions

### 方案 1: 使用不在保留范围的端口 (推荐) ✅

已修改为使用 **8080** 端口：

```yaml
ports:
  - "8080:3000"  # 宿主机:容器
```

访问地址: `http://localhost:8080`

### 方案 2: 释放 Windows 保留端口 (高级)

**⚠️ 需要管理员权限，可能影响系统服务**

```powershell
# 1. 停止 Hyper-V 相关服务
net stop winnat

# 2. 重新配置动态端口范围（避开常用端口）
netsh int ipv4 set dynamic tcp start=49152 num=16384
netsh int ipv6 set dynamic tcp start=49152 num=16384

# 3. 重启服务
net start winnat

# 4. 重启 Docker Desktop
```

### 方案 3: 查找占用端口的进程 (如果真的是被占用)

**Windows PowerShell:**
```powershell
# 查找占用 3000 端口的进程
netstat -ano | findstr :3000

# 根据 PID 查看进程
tasklist | findstr <PID>

# 结束进程 (谨慎操作)
taskkill /PID <PID> /F
```

**Windows CMD:**
```cmd
netstat -ano | findstr :3000
```

### 方案 3: 检查 Windows 保留端口

**查看保留端口范围:**
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**如果 3000 在保留范围内，排除它:**
```powershell
# 以管理员身份运行
netsh int ipv4 add excludedportrange protocol=tcp startport=3000 numberofports=1
```

### 方案 4: 重启 NAT 服务

```powershell
# 以管理员身份运行
net stop winnat
net start winnat
```

### 方案 5: 禁用 Hyper-V 动态端口保留

```powershell
# 以管理员身份运行
netsh int ipv4 set dynamic tcp start=49152 num=16384
netsh int ipv6 set dynamic tcp start=49152 num=16384
```

## 常用端口建议 / Recommended Ports

根据 Windows 保留端口范围，推荐使用这些端口：

```yaml
# 推荐端口（不在保留范围内）
ports:
  - "8080:3000"  # ✅ 推荐 (常用 HTTP 备用端口)
  - "8888:3000"  # ✅ 备选
  - "9000:3000"  # ✅ 备选
  - "5000:3000"  # ✅ 备选

# ❌ 避免使用（可能被 Windows 保留）
# - "3000:3000"  # 在 2982-3081 范围内
# - "3001:3000"  # 在 2982-3081 范围内
# - "3100:3000"  # 可能在保留范围内
```

### 如何选择端口

1. **检查保留范围**:
   ```powershell
   netsh interface ipv4 show excludedportrange protocol=tcp
   ```

2. **选择不在范围内的端口**:
   - 8080 (最常用)
   - 8000-8999 (通常安全)
   - 9000-9999 (通常安全)
   - 5000-5999 (通常安全)

## 快速测试端口是否可用 / Test Port Availability

**PowerShell:**
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

**使用 curl:**
```bash
curl http://localhost:3001
```

## Docker Compose 端口配置 / Port Configuration

### 当前配置
```yaml
services:
  app:
    ports:
      - "3001:3000"  # 宿主机端口:容器端口
```

### 说明
- **3001** - 宿主机访问端口 (你在浏览器中使用的)
- **3000** - 容器内部端口 (应用监听的端口，不需要改)

### 修改端口后重启

```bash
# 停止容器
docker-compose down

# 重新启动
docker-compose up -d

# 验证
curl http://localhost:3001
```

## 环境变量更新 / Update Environment Variables

如果修改了端口，记得更新 `.env` 文件：

```env
BASE_URL=http://localhost:3001
```

## 生产环境建议 / Production Recommendations

### 使用标准 HTTP/HTTPS 端口

```yaml
# HTTP
ports:
  - "80:3000"

# HTTPS (需要反向代理)
ports:
  - "443:3000"
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 使用 Traefik (推荐)

```yaml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
```

## 故障排查步骤 / Troubleshooting Steps

1. **检查端口占用**
   ```powershell
   netstat -ano | findstr :3001
   ```

2. **检查 Docker 容器状态**
   ```bash
   docker-compose ps
   ```

3. **查看容器日志**
   ```bash
   docker-compose logs app
   ```

4. **测试容器内部**
   ```bash
   docker-compose exec app wget -O- http://localhost:3000
   ```

5. **测试宿主机访问**
   ```bash
   curl http://localhost:3001
   ```

## 常见错误 / Common Errors

### Error: "port is already allocated"
```bash
# 停止所有容器
docker-compose down

# 清理网络
docker network prune

# 重新启动
docker-compose up -d
```

### Error: "driver failed programming external connectivity"
```bash
# 重启 Docker Desktop
# 或重启 Docker 服务
net stop com.docker.service
net start com.docker.service
```

## 验证部署 / Verify Deployment

```bash
# 1. 检查容器运行
docker-compose ps

# 2. 检查日志
docker-compose logs -f app

# 3. 测试 API
curl http://localhost:8080/api/domains

# 4. 浏览器访问
# 打开 http://localhost:8080
```

## 成功标志 / Success Indicators

✅ 容器状态: `Up`
✅ 端口映射: `0.0.0.0:8080->3000/tcp`
✅ 日志显示: `Listening on http://[::]:3000`
✅ 浏览器可访问: `http://localhost:8080`

## Windows 端口保留问题详解 / Windows Port Reservation Details

### 为什么会有端口保留？

Windows 10/11 使用 Hyper-V 和 Windows NAT (WinNAT) 来支持：
- Docker Desktop
- WSL 2
- Hyper-V 虚拟机
- Windows 容器

这些服务会动态保留端口范围，导致某些端口无法使用。

### 常见保留范围

```
2586-2685
2686-2785
2882-2981
2982-3081  ← 包含 3000, 3001
3104-3203
3267-3366
3390-3489
50000-50059
```

### 永久解决方案

如果你经常需要使用 3000 端口，可以：

1. **排除特定端口** (管理员权限):
   ```powershell
   # 添加端口排除规则
   netsh int ipv4 add excludedportrange protocol=tcp startport=3000 numberofports=1 store=persistent
   
   # 重启 Docker Desktop
   ```

2. **修改动态端口范围** (管理员权限):
   ```powershell
   # 将动态端口范围移到更高的范围
   netsh int ipv4 set dynamicport tcp start=49152 num=16384
   netsh int ipv6 set dynamicport tcp start=49152 num=16384
   
   # 重启计算机
   ```

### 注意事项

⚠️ 修改系统端口配置可能影响：
- Docker Desktop 功能
- WSL 2 网络
- Hyper-V 虚拟机
- 其他依赖 WinNAT 的服务

**建议**: 使用 8080 等不冲突的端口，而不是修改系统配置。
