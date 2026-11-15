# Upgrading

[English](upgrade.md) | [Tiếng Việt](../vi/nang-cap.md) · [← README](../../README.en.md)

## System upgrades in the Dashboard

Administrators can open **System upgrade** from the administration menu to check the source code version on GitHub and the database version, then run pending migrations. If the current source code is older than the latest GitHub version, the system requires the source code to be updated before migrations can run. Direct migration support requires `SUPABASE_DB_URL` on the server. Without it, `/dashboard/upgrade` still provides the SQL bundle from `/setup` for manual execution.

**Restoring data needs the migration `20261026000000_add_restore_backup.sql`.** From this version, restore (Dashboard → Data) runs in a single database transaction through the `restore_backup` function: if anything fails halfway, the current data is kept as it was. Existing self-hosted installs must run this migration (run the migrations on `/dashboard/upgrade`, or run the file from `docs/migrations/` in the Supabase SQL Editor). Until then, restore still works the old way (delete, then insert in chunks, without a transaction) and shows a reminder to upgrade the database. Restore files can be up to 25 MB; on Vercel, request bodies are limited to about 4.5 MB, so very large family trees (several thousand members or more) are best restored on a self-hosted install.

**Updating generations needs the migration `20261026120000_add_update_generations.sql`.** The "Apply" button on the Lineage page and the option to update descendants' generations when editing a member save all members with a single call to the database function `update_generations`, in one transaction: if one row fails (a member that was just deleted, or one you are not allowed to edit), no row is changed and the app reports the error. The function runs with the caller's rights (SECURITY INVOKER), so the Row Level Security of the `persons` table still applies. Until the migration is run, the app updates people one by one as before and shows a reminder to upgrade the database.

**Merging duplicates needs the migration `20261027120000_add_merge_persons.sql`.** The "People that may be duplicates" tool (Dashboard → Backup & restore) can merge two profiles into one through the database function `merge_persons`, in one transaction: the merged-away member's relationships are re-pointed to the kept one (duplicates and the relationship between the two profiles are removed), private details fill the kept profile's empty fields, empty columns (birth and death dates, generation, birth order, avatar) take the merged-away values, other names are remembered, notes are appended, and the merged-away profile is deleted. The app requires a preview of what will move, recommends downloading a backup first, and requires typing the deleted profile's name to confirm. If the kept profile would end up with more than 2 birth parents, 2 birth parents of the same gender, or one profile is an ancestor of the other (the tree would loop), the preview shows a warning that must be acknowledged before the name can be typed. A merge cannot be undone; if anything fails halfway, nothing is changed. Admins only. Until the migration is run, the merge button shows a reminder to upgrade the database.

**Yearly events need the migration `20261027180000_custom_events_recurrence.sql`.** It adds a `recurrence` column to `custom_events` (`none` = once, `yearly_solar` = every year on the solar day and month, `yearly_lunar` = every year on the lunar day and month of the event date, leap month kept like a death anniversary) with the default `none`: existing events stay as they are and no data is lost. It also updates `restore_backup` so a restore keeps each event's recurrence. The **System upgrade** page lists it automatically. Until it is run, one-off events can still be added and edited; choosing a yearly option shows a database error until you upgrade.

**Adding a file to the current tree needs the migration `20261030180000_add_append_import.sql`.** It only adds the `append_import` function (insert only, never deletes or updates a row); no table changes. The **System upgrade** page lists it automatically. Until it is run, "Add to the current tree" asks for the upgrade and adds nothing; restore (replace the whole tree) works as before.

**Burial places need the migration `20261028120000_add_burial_place.sql`.** It adds a nullable text column `burial_place` to `persons` to record where a member is buried. Like the dates of death it is public: every approved member can read it, and the Row Level Security is unchanged. It also updates `restore_backup` (a restore keeps the burial place; older backups without it restore it empty) and `merge_persons` (a merge fills the kept profile's empty burial place from the merged-away one). JSON backups (format v5) and CSV exports gain a `burial_place` column. The **System upgrade** page lists it automatically. Until it is run, the app works as before; burial places just cannot be stored yet.

**Locking an account revokes its approval link with the migration `20261031120000_revoke_approval_link_on_lock.sql`.** It only redefines the lock/unlock function (`set_user_active_status`): locking marks the account's unused approval request as used. No table changes and no data removed; backup and restore are unchanged. The **System upgrade** page lists it automatically.

**Locked accounts stop asking for approval, and approval is safe against a concurrent lock, with the migration `20261031180000_lock_blocks_approval.sql`.** It adds a nullable `locked_at` column to `profiles`: set when an administrator locks the account, cleared on unlock. Accounts already locked whose approval link was used or revoked are filled in; other inactive accounts stay "pending". It also redefines `set_user_active_status` (sets/clears `locked_at`) and adds `approve_user_request` (callable by the server's service role only) to approve in one transaction. No data removed; backup and restore are unchanged. The **System upgrade** page lists it automatically. An account locked before this migration without a used or revoked approval link (e.g. locked before the migration `20261031120000`) still counts as pending: lock it once more in **Manage users** to stop the emails.

**Member tags on photos need the migration `20261112120000_add_gallery_item_persons.sql`.** It adds the table `gallery_item_persons` (photo – member; deleting a photo or a member deletes its tags; read access like `gallery_items`, only admins/editors write) and updates the functions `restore_backup` and `merge_persons`. Additive, safe to run again, deletes no data. The **System upgrade** page lists this migration by itself. Until it runs, the gallery works as before, tags just cannot be set.

## Source code updates

When `/dashboard/upgrade` reports that the source code is outdated, update the **entire source tree** to the latest version. Do not only change the `version` number in `package.json` to bypass the warning, because migrations may require corresponding code changes.

**If deployed on Vercel:**

1. Confirm that the Vercel project is linked to the correct `homielab/giapha-os` repository and deployment branch.
2. Synchronize that branch with the latest GitHub code. If updating from a local Git checkout:

   ```bash
   git fetch origin
   git pull --ff-only origin main
   git push origin main
   ```

3. Wait for Vercel to finish building and deploying. If it does not deploy automatically, open **Deployments** and choose **Redeploy** on the latest deployment.
4. Reopen `/dashboard/upgrade`, click **Check again**, and confirm that the current version is not lower than the GitHub version.

**If running locally or self-hosted:**

```bash
git fetch origin
git pull --ff-only origin main
bun install
bun run build
```

Restart the application with the command you use, such as `bun run start`. Once the source code is updated, an administrator can return to `/dashboard/upgrade` and run the database migrations. Back up the database before upgrading. If `SUPABASE_DB_URL` is not configured, use the SQL bundle at `/setup` as described above.
