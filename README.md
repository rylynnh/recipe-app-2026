# 我的菜谱

一个面向受邀成员的共享菜谱库，使用 Supabase 进行登录、跨设备同步和私有图片存储。

## 上线前配置

1. 在 Supabase 创建项目，并在 Authentication 的 URL Configuration 中加入：
   - `https://rylynnh.github.io/recipe-app-2026/`
   - 你的 Vercel 生产域名（如仍使用）
2. 在 Authentication 的 Email 模板中启用 Magic Link；生产环境应关闭“允许任意新用户注册”或在应用层仅授予白名单账户访问权。
3. 在 SQL Editor 运行 [共享权限迁移](supabase/migrations/202607270001_shared_household_access.sql)。它会开启 RLS 并删除这些表既有策略，请先备份数据库。
4. 在 Storage 创建名为 `recipe-images` 的 **Private** bucket，并运行迁移末尾列出的四条 Storage policy。图片必须存放在 `household-id/recipe-id/file.jpg` 路径。
5. 创建家庭组并将允许的邮箱加入白名单。首次 owner 设置可在 SQL Editor 执行：

   ```sql
   insert into public.households (name) values ('我的家庭') returning id;
   insert into public.allowed_emails (email, household_id, role)
   values ('你的邮箱@example.com', '上一步返回的 household UUID', 'owner');
   ```

   之后 owner 先通过 Magic Link 登录一次，应用会自动创建其成员记录。添加成员时插入 `allowed_emails`，角色使用 `member`。

6. 按 `.env.example` 在本地或 Vercel 配置下列环境变量：

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   publishable/anon key 可以出现在浏览器中；绝不能配置 `service_role` 或 secret key。

## 权限模型

- `owner`：管理成员、允许删除和清空家庭组数据。
- `member`：可查看、新增和编辑；不能删除共享内容。
- 只有 `allowed_emails` 中的邮箱完成 Magic Link 登录后，才能进入应用与同步数据。

## 本地开发

```bash
npm install
npm run dev
```

提交前运行：

```bash
npm run check
npm run lint
npm run build
```
