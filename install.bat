@echo off
chcp 65001 >nul
echo 正在安装依赖...
echo.
D:\Node\npm.cmd install
echo.
echo 依赖安装完成！
echo 要启动本地服务器，请运行 start.bat
echo 然后访问 http://localhost:3000
pause
