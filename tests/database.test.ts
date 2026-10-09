import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("database enforces owner access, two-party confirmation, reservations, receipt idempotency and quotas", async () => {
  const db = new PGlite();
  const u = "00000000-0000-4000-8000-000000000001",
    v = "00000000-0000-4000-8000-000000000002",
    x = "00000000-0000-4000-8000-000000000003";
  const l = "00000000-0000-4000-8000-000000000011",
    p = "00000000-0000-4000-8000-000000000021",
    p2 = "00000000-0000-4000-8000-000000000022";
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
      insert into auth.users values('${u}'),('${v}'),('${x}');
      create table public.trainer_backups(friend_code text,sync_key text);
      insert into public.trainer_backups values('123','legacy-secret');
      grant all on public.trainer_backups to anon,authenticated;
      alter table public.trainer_backups enable row level security;
      create policy old_public on public.trainer_backups for all using(true) with check(true);`);
    const migration = await fs.readFile(
      "supabase/migrations/202610080001_secure_trading.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration); // Repeat application must be safe.
    await db.exec(
      await fs.readFile(
        "supabase/migrations/202610080002_card_catalog.sql",
        "utf8",
      ),
    );
    await db.exec(
      await fs.readFile(
        "supabase/migrations/202610080003_scan_quota.sql",
        "utf8",
      ),
    );
    const login = async (id: string, role = "authenticated") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role " + role);
    };
    await login("", "anon");
    await assert.rejects(
      db.query("select * from trainer_backups"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.register_trainer_v2('1234567890123456','A','')"),
      /permission denied/,
    );
    await login(u);
    await db.query(
      "select public.register_trainer_v2('1234567890123456','A','')",
    );
    await login(v);
    await db.query(
      "select public.register_trainer_v2('2234567890123456','B','')",
    );
    await login(x);
    await db.query(
      "select public.register_trainer_v2('3234567890123456','C','')",
    );
    await login(u);
    await db.query(
      "select public.publish_listing_v2($1,array['A1-001','A1-005'],array['A1-006'],'{\"A1-001\":1,\"A1-005\":2}', 'test')",
      [l],
    );
    await assert.rejects(
      db.query(
        "select public.publish_listing_v2($1,array['A1-001'],array['A1-004'],'{\"A1-001\":1}', '')",
        [p],
      ),
      /同稀有度/,
    );
    await db.query("select public.save_backup_v2('{}','{}','[]',0)");
    await assert.rejects(
      db.query("select public.save_backup_v2('{}','{}','[]',0)"),
      /较新备份/,
    );
    await login(v);
    assert.equal(
      (await db.query("select * from trainer_backups_v2")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.cancel_listing_v2($1)", [l]),
      /自己的挂单/,
    );
    await db.query(
      "select public.request_trade_v2($1,$2,'A1-006','A1-001',false,false)",
      [p, l],
    );
    await db.query(
      "select public.request_trade_v2($1,$2,'A1-006','A1-001',false,false)",
      [p2, l],
    ); // Same offer returns existing row.
    assert.equal(
      (await db.query("select * from trade_proposals_v2")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("update trade_proposals_v2 set status='completed'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.respond_trade_v2($1,'accept')", [p]),
      /接收方/,
    );
    await assert.rejects(
      db.query("select public.respond_trade_v2($1,'confirm')", [p]),
      /等待对方/,
    );
    await login(x);
    assert.equal(
      (await db.query("select * from trade_proposals_v2")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.respond_trade_v2($1,'confirm')", [p]),
      /无权/,
    );
    await db.query(
      "select public.request_trade_v2($1,$2,'A1-006','A1-001',false,false)",
      [p2, l],
    );
    await login(u);
    await db.query("select public.respond_trade_v2($1,'accept')", [p]);
    await assert.rejects(
      db.query("select public.respond_trade_v2($1,'accept')", [p2]),
      /预约/,
    );
    await assert.rejects(
      db.query("select public.cancel_listing_v2($1)", [l]),
      /进行中的交换/,
    );
    await login(v);
    await db.query("select public.respond_trade_v2($1,'confirm')", [p]);
    const pending: any = (
      await db.query("select * from trade_proposals_v2 where id=$1", [p])
    ).rows[0];
    assert.equal(pending.status, "accepted");
    assert.equal(
      (
        await db.query<any>(
          "select offer_quantities from trade_listings_v2 where id=$1",
          [l],
        )
      ).rows[0].offer_quantities["A1-001"],
      1,
    );
    await login(u);
    await db.query("select public.respond_trade_v2($1,'confirm')", [p]);
    await db.query("select public.respond_trade_v2($1,'confirm')", [p]);
    const done: any = (
      await db.query("select * from trade_proposals_v2 where id=$1", [p])
    ).rows[0];
    assert.equal(done.status, "completed");
    const after: any = (
      await db.query("select * from trade_listings_v2 where id=$1", [l])
    ).rows[0];
    assert.equal(after.offer_quantities["A1-001"], 0);
    assert.equal(after.offer_quantities["A1-005"], 2);
    assert.equal(after.status, "active");
    await assert.rejects(
      db.query("select public.respond_trade_v2($1,'decline')", [p]),
      /不能撤销/,
    );
    for (let i = 0; i < 20; i++)
      await db.query("select public.consume_scan_quota_v2()");
    await assert.rejects(
      db.query("select public.consume_scan_quota_v2()"),
      /Daily account/,
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from trainer_backups")).rows.length,
      1,
    ); // Legacy rows preserved.
  } finally {
    await db.close();
  }
});
