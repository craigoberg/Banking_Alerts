"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupLayout } from "@/lib/groups";
import { formatMoney } from "@/lib/money";
import type { AccountCard, AccountGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

type DropTarget = { groupId: string; index: number };

function cardsInGroup(cards: AccountCard[], groupId: string): AccountCard[] {
  return cards
    .filter((card) => card.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nickname.localeCompare(b.nickname));
}

function layoutFrom(groups: AccountGroup[], cards: AccountCard[]): GroupLayout[] {
  return [...groups]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((group) => ({
      id: group.id,
      accountIds: cardsInGroup(cards, group.id).map((card) => card.id),
    }));
}

function layoutAfterMove(
  groups: AccountGroup[],
  cards: AccountCard[],
  accountId: string,
  targetGroupId: string,
  index: number,
): GroupLayout[] | null {
  const layout = layoutFrom(groups, cards);
  const source = layout.find((group) => group.accountIds.includes(accountId));
  const target = layout.find((group) => group.id === targetGroupId);
  if (!source || !target) return null;
  const fromIndex = source.accountIds.indexOf(accountId);
  if (source.id === target.id && (index === fromIndex || index === fromIndex + 1)) return null;
  source.accountIds.splice(fromIndex, 1);
  let insertAt = index;
  if (source.id === target.id && fromIndex < insertAt) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, target.accountIds.length));
  target.accountIds.splice(insertAt, 0, accountId);
  return layout;
}

function dropTargetAt(x: number, y: number, draggingId: string): DropTarget | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof Element)) continue;
    const card = node.closest("[data-card-id]");
    if (card instanceof HTMLElement && card.dataset.cardId && card.dataset.groupId) {
      if (card.dataset.cardId === draggingId) continue;
      const rect = card.getBoundingClientRect();
      const cardIndex = Number(card.dataset.index ?? "0");
      const after = y > rect.top + rect.height / 2;
      return { groupId: card.dataset.groupId, index: cardIndex + (after ? 1 : 0) };
    }
    const zone = node.closest("[data-drop-group]");
    if (zone instanceof HTMLElement && zone.dataset.dropGroup) {
      return {
        groupId: zone.dataset.dropGroup,
        index: Number(zone.dataset.dropIndex ?? "0"),
      };
    }
  }
  return null;
}

export function AccountGroups({
  groups,
  cards,
  onCreate,
  onRename,
  onDelete,
  onToggle,
  onLayout,
}: {
  groups: AccountGroup[];
  cards: AccountCard[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, collapsed: boolean) => Promise<void>;
  onLayout: (layout: GroupLayout[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; nickname: string } | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const dragRef = useRef<{
    accountId: string;
    pointerId: number;
    active: boolean;
    x: number;
    y: number;
  } | null>(null);
  const dropRef = useRef<DropTarget | null>(null);

  const ordered = [...groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  function rememberDrop(value: DropTarget | null) {
    dropRef.current = value;
    setDrop(value);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update groups.");
    } finally {
      setBusy(false);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>, card: AccountCard) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, textarea")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      accountId: card.id,
      pointerId: event.pointerId,
      active: false,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>, card: AccountCard) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId || session.accountId !== card.id) return;
    if (!session.active) {
      if (Math.hypot(event.clientX - session.x, event.clientY - session.y) < 6) return;
      session.active = true;
      setDraggingId(card.id);
    }
    setGhost({ x: event.clientX, y: event.clientY, nickname: card.nickname });
    rememberDrop(dropTargetAt(event.clientX, event.clientY, card.id));
  }

  function onPointerUp(event: PointerEvent<HTMLElement>, card: AccountCard) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId || session.accountId !== card.id) return;
    dragRef.current = null;
    const target = dropRef.current;
    const moved = session.active;
    setDraggingId(null);
    setGhost(null);
    rememberDrop(null);
    if (!moved || !target) return;
    const layout = layoutAfterMove(groups, cards, card.id, target.groupId, target.index);
    if (!layout) return;
    void run(() => onLayout(layout));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Drag a card to reorder it or move it between groups.</p>
        <Button type="button" variant="outline" onClick={() => { setName(""); setOpen(true); }}>
          New group
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-alarm" role="alert">
          {error}
        </p>
      ) : null}
      {ordered.map((group) => {
        const groupCards = cardsInGroup(cards, group.id);
        const other = ordered.find((item) => item.id !== group.id);
        const highlighted = drop?.groupId === group.id;
        return (
          <section
            key={group.id}
            data-group-name={group.name}
            data-collapsed={group.collapsed ? "true" : "false"}
            data-drop-group={group.id}
            data-drop-index={String(groupCards.length)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-border p-3",
              highlighted && "border-warning",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-expanded={!group.collapsed}
                aria-label={group.collapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                onClick={() => void run(() => onToggle(group.id, !group.collapsed))}
              >
                {group.collapsed ? <ChevronRight /> : <ChevronDown />}
              </Button>
              {editingId === group.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(async () => {
                      await onRename(group.id, draft);
                      setEditingId(null);
                    });
                  }}
                >
                  <Label htmlFor={`rename-${group.id}`} className="sr-only">
                    Group name
                  </Label>
                  <Input
                    id={`rename-${group.id}`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="h-8 max-w-xs"
                    autoFocus
                  />
                  <Button type="submit" size="sm" disabled={busy}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <h2 className="text-base font-medium">{group.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {groupCards.length === 1 ? "1 account" : `${groupCards.length} accounts`}
                  </p>
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(group.id);
                        setDraft(group.name);
                        setConfirmId(null);
                      }}
                    >
                      Rename
                    </Button>
                    {confirmId === group.id ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {groupCards.length === 0
                            ? `Delete ${group.name}?`
                            : `Move ${groupCards.length === 1 ? "this card" : "these cards"} to ${other?.name} and delete ${group.name}?`}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await onDelete(group.id);
                              setConfirmId(null);
                            })
                          }
                        >
                          Delete group
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!other}
                        title={other ? `Delete ${group.name}` : "Keep at least one group."}
                        onClick={() => setConfirmId(group.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            {group.collapsed ? null : groupCards.length === 0 ? (
              <div
                data-drop-group={group.id}
                data-drop-index="0"
                className="rounded-lg border border-dashed border-border px-3 py-8 text-sm text-muted-foreground"
              >
                Drag an account here.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {groupCards.map((card, index) => (
                  <li
                    key={card.id}
                    data-card-id={card.id}
                    data-nickname={card.nickname}
                    data-group-id={group.id}
                    data-index={index}
                    className={cn("touch-none", draggingId === card.id && "opacity-40")}
                    onPointerDown={(event) => onPointerDown(event, card)}
                    onPointerMove={(event) => onPointerMove(event, card)}
                    onPointerUp={(event) => onPointerUp(event, card)}
                    onPointerCancel={(event) => onPointerUp(event, card)}
                  >
                    {drop?.groupId === group.id && drop.index === index ? (
                      <div className="mb-2 h-1 rounded-full bg-warning" />
                    ) : null}
                    <AccountBalanceCard card={card} />
                  </li>
                ))}
                {drop?.groupId === group.id && drop.index === groupCards.length ? (
                  <li className="h-1 self-center rounded-full bg-warning" aria-hidden="true" />
                ) : null}
              </ul>
            )}
          </section>
        );
      })}

      {ghost ? (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-warning bg-card px-3 py-2 text-sm shadow-lg"
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          <span className="inline-flex items-center gap-2">
            <GripVertical className="size-4 text-muted-foreground" />
            {ghost.nickname}
          </span>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>Name the group, then drag account cards into it.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await onCreate(name);
                setOpen(false);
                setName("");
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                Create group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountBalanceCard({ card }: { card: AccountCard }) {
  const tone =
    card.under === true ? "border-l-alarm" : card.under === false ? "border-l-ok" : "border-l-warning";
  return (
    <Card className={`cursor-grab border-l-4 active:cursor-grabbing ${tone}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="inline-flex items-center gap-2">
            <GripVertical className="size-4 text-muted-foreground" aria-hidden="true" />
            {card.nickname}
          </CardTitle>
          <ThresholdMark under={card.under} />
        </div>
        <p className="text-sm text-muted-foreground">{card.bankName}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-medium">
          {card.currentAmount === null ? "No balance" : formatMoney(card.currentAmount, card.currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          Threshold {formatMoney(card.thresholdMinor, card.currency)}
        </p>
        {card.accountNumberMasked ? (
          <p className="text-sm text-muted-foreground">Ending {card.accountNumberMasked}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Not linked to RedBark yet</p>
        )}
        {card.freshness === "stale" || card.freshness === "unavailable" ? (
          <p className="text-sm text-warning">Balance {card.freshness}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ThresholdMark({ under }: { under: boolean | null }) {
  if (under === true) return <span className="text-sm font-medium text-alarm">Under</span>;
  if (under === false) return <span className="text-sm font-medium text-ok">Above</span>;
  return <span className="text-sm font-medium text-warning">No balance</span>;
}
