私人轻小说 AI 翻译阅读器 V1 项目规格书
1. 项目目标

开发一个部署在 NAS 上、仅供个人使用的网页应用，用于阅读和翻译日文轻小说内容。

用户可以通过网页访问该应用，在电脑或手机上完成以下操作：

创建一本书
上传 txt 文件
上传 epub 文件
手动粘贴日文正文
调用用户自己配置的 AI API 进行翻译
保存原文和译文到本地
在网页阅读器中阅读章节
重新翻译某一章
管理简单术语表

本项目 不以公开传播、公开分享、二次分发为目的，仅为个人阅读辅助工具。

2. V1 范围
2.1 必须实现的功能
A. 书籍管理
创建书籍
编辑书籍标题
删除书籍
查看书架列表
点击进入书籍详情页
B. 章节导入

支持以下导入方式：

手动新建章节并粘贴正文
上传 txt 文件并导入为一本书或多个章节
上传 epub 文件并解析章节内容导入
C. 翻译功能
使用用户配置的 API Key 和模型进行翻译
支持至少两类翻译 provider：
OpenAI-compatible provider
Gemini provider
支持将章节分段翻译
支持重新翻译单个章节
支持翻译结果缓存，避免重复消耗 API
D. 阅读功能
阅读章节原文和译文
支持仅看译文
支持原文 / 译文对照显示
可切换上一章 / 下一章
页面适配电脑和手机浏览器
E. 本地持久化
本地保存书籍、章节、原文、译文、术语表、模型配置
应用重启后数据不丢失
F. 术语表
支持定义术语表条目
每条术语表包含：
原文术语
目标译法
备注（可选）
翻译时将术语表注入提示词
G. 基础设置
配置翻译 provider
配置 API key
配置模型名
配置翻译模式
配置分段长度
H. Docker 部署
项目必须能通过 Docker Compose 启动
数据目录必须挂载到宿主机
在 NAS 上能通过局域网网页访问
3. V1 明确不做的功能

以下功能 本版本不实现：

自动抓取 Narou 或其他小说网站目录页
自动批量抓取网站章节正文
浏览器插件
用户注册 / 登录系统
多用户权限管理
评论、分享、社交功能
云同步
OCR
自动总结、角色关系图、世界观分析
TTS 朗读
支持 PDF
高级搜索
全文 AI 润色
自动重试复杂调度队列
公网发布优化
4. 目标用户

本项目当前仅服务于 单一用户，即部署者本人。

用户特征：

会使用电脑和网页
不懂编程
可以自己提供 API key
希望在 NAS 上长期运行一个私人阅读工具
5. 技术方案
5.1 总体架构

采用前后端分离但轻量化方案：

前端：React + Next.js
后端：FastAPI
数据库：SQLite
文件存储：本地目录
部署：Docker Compose

说明：

前端负责页面展示和交互
后端负责文件上传、EPUB/TXT 解析、翻译请求、数据库读写
SQLite 负责存储结构化数据
文件系统负责存储上传文件和导出文件
6. 页面设计
6.1 页面列表
A. 书架页

路径：/

功能：

展示所有书籍
新建书籍按钮
导入 txt / epub 按钮
进入书籍详情页
删除书籍

展示内容：

书名
章节数
最后更新时间
B. 书籍详情页

路径：/books/{book_id}

功能：

查看章节列表
新建章节
粘贴正文导入章节
进入章节阅读页
重新翻译章节
编辑书名
删除章节

展示内容：

书名
章节列表
每章翻译状态
C. 阅读页

路径：/books/{book_id}/chapters/{chapter_id}

功能：

阅读当前章节
切换阅读模式：
仅译文
原文 / 译文对照
上一章 / 下一章
重新翻译当前章
编辑当前章标题
D. 设置页

路径：/settings

功能：

配置 provider
配置 API key
配置模型名
配置默认翻译提示词
配置分段长度
配置翻译模式
E. 术语表页

路径：/glossary

功能：

查看术语表
新建术语
编辑术语
删除术语
7. 数据模型
7.1 Book

字段：

id
title
created_at
updated_at
7.2 Chapter

字段：

id
book_id
index_in_book
title
source_text
translated_text
source_hash
translation_status
last_translated_at
created_at
updated_at

说明：

translation_status 可取值：
pending
translated
failed
7.3 TranslationConfig

字段：

id
provider_type
api_base_url
model_name
api_key
prompt_template
chunk_size
translation_mode
updated_at

说明：

API key 初版可以直接存数据库
后续可改为环境变量或加密存储
V1 允许先用简单方案
7.4 GlossaryEntry

字段：

id
source_term
target_term
note
created_at
updated_at
7.5 TranslationRecord

字段：

id
chapter_id
provider_type
model_name
prompt_hash
source_hash
translated_text
created_at

说明：

用于缓存翻译结果
同一章节在相同配置下可直接命中缓存
8. 翻译逻辑
8.1 provider 设计

必须实现统一翻译接口，例如：

translate_with_openai_compatible()
translate_with_gemini()

对外统一为：

输入：原文、配置、术语表
输出：译文
8.2 翻译流程

单章翻译流程：

读取章节原文
计算 source hash
根据章节内容按段或按长度切块
读取当前设置和术语表
构造提示词
按块调用翻译 API
拼接结果
保存译文
写入翻译记录缓存
8.3 缓存策略

必须有缓存。

命中条件建议为：

source_hash 相同
provider_type 相同
model_name 相同
prompt_hash 相同

如果命中缓存，则不重复请求 API。

8.4 默认翻译要求

默认提示词目标：

将日文轻小说翻译为流畅自然的简体中文
保留人物称呼、语气、叙事结构
尽量保持专有名词一致
不额外解释剧情
不加编者注
保持段落结构

翻译模式至少支持：

直译
通顺翻译
9. TXT / EPUB 导入要求
9.1 TXT
支持上传 .txt
支持 UTF-8 编码
若文本中存在明显章节分隔，可尝试按章节拆分
若无法识别章节，则整本作为单章导入
9.2 EPUB
支持上传 .epub
提取书名
提取章节标题和章节正文
忽略封面、目录导航、版权页等无正文价值内容
导入后生成书籍和章节记录
10. 阅读器要求
支持手机和桌面浏览器
页面简洁
正文字体清晰
支持长文本滚动阅读
支持上一章 / 下一章跳转
支持阅读模式切换：
仅译文
原文在上，译文在下
不要求 V1 做复杂分页效果
11. 文件与目录要求

项目建议目录结构如下：

project-root/
  backend/
    app/
      api/
      core/
      models/
      services/
      schemas/
      utils/
      main.py
    requirements.txt
    Dockerfile
  frontend/
    app/
    components/
    lib/
    package.json
    Dockerfile
  data/
  uploads/
  docker-compose.yml
  .env.example
  PROJECT_SPEC.md

说明：

backend/ 为 FastAPI 项目
frontend/ 为 Next.js 项目
data/ 用于 SQLite 和持久化数据
uploads/ 用于上传文件缓存
12. API 设计要求

后端至少提供以下接口：

书籍
GET /books
POST /books
GET /books/{id}
PUT /books/{id}
DELETE /books/{id}
章节
POST /books/{id}/chapters
GET /books/{id}/chapters
GET /chapters/{id}
PUT /chapters/{id}
DELETE /chapters/{id}
导入
POST /import/txt
POST /import/epub
POST /import/paste
翻译
POST /chapters/{id}/translate
POST /chapters/{id}/retranslate
设置
GET /settings
PUT /settings
术语表
GET /glossary
POST /glossary
PUT /glossary/{id}
DELETE /glossary/{id}
13. 部署要求
13.1 Docker Compose

必须包含：

frontend 服务
backend 服务

可选：

单独 nginx 反向代理服务
13.2 持久化

以下目录必须挂载 volume：

SQLite 数据目录
上传文件目录
13.3 环境变量

必须支持通过 .env 配置：

后端端口
前端端口
数据路径
上传路径
初始 provider 配置
14. 界面风格要求
简洁
偏阅读器风格
暗色模式优先可选，但 V1 不强求
不追求复杂设计
重点是易读、稳定、响应快
15. 开发优先级
第一优先级
后端基本结构
SQLite 数据模型
书籍和章节 CRUD
粘贴正文导入
API 翻译
保存译文
基础阅读页
第二优先级
txt 导入
epub 导入
术语表
翻译缓存
设置页
第三优先级
原文 / 译文对照模式
手机端优化
导出功能
16. 验收标准

当以下条件全部成立时，V1 视为可用：

用户能在网页中创建一本书
用户能粘贴一章日文正文并保存
用户能配置一个 API provider
用户能点击按钮翻译该章节
译文能保存到本地
刷新页面后数据仍存在
用户能在手机浏览器访问并阅读
用户能上传 txt 文件并导入
用户能上传 epub 文件并导入至少部分有效章节
整个应用能通过 Docker Compose 启动
17. 开发原则
先做小而稳的 V1
禁止为了炫技引入复杂架构
禁止为了“未来也许有用”过度设计
优先保证可维护性和可读性
优先保证单人私用体验
所有功能必须先能本地跑通，再考虑 NAS 部署
18. 备注
本项目是私人阅读辅助工具
V1 以手动导入和文件导入为主
自动抓站功能不在本版本范围内
后续如需扩展，可在 V2 讨论浏览器辅助导入等功能