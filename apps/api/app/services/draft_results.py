import asyncio

from app.integrations.sleeper.client import SleeperClient
from app.integrations.sleeper.models import SleeperDraft, SleeperDraftPick


async def get_pick_numbers(
    client: SleeperClient, drafts: list[SleeperDraft]
) -> dict[tuple[str, int, int], int]:
    completed = [draft for draft in drafts if draft.status == "complete"]
    if not completed:
        return {}
    results = await asyncio.gather(*(client.get_draft_picks(draft.draft_id) for draft in completed))
    return build_pick_numbers(completed, results)


def build_pick_numbers(
    drafts: list[SleeperDraft],
    results: list[list[SleeperDraftPick]],
    roster_by_owner: dict[str, int] | None = None,
) -> dict[tuple[str, int, int], int]:
    numbers: dict[tuple[str, int, int], int] = {}
    for draft, picks in zip(drafts, results, strict=True):
        roster_by_slot = {
            int(slot): roster_id for slot, roster_id in (draft.slot_to_roster_id or {}).items()
        }
        roster_by_slot.update(
            {
                slot: roster_by_owner[owner_id]
                for owner_id, slot in (draft.draft_order or {}).items()
                if roster_by_owner and owner_id in roster_by_owner
            }
        )
        for pick in picks:
            original_roster_id = roster_by_slot.get(pick.draft_slot or -1, pick.roster_id)
            numbers[(draft.season, pick.round, original_roster_id)] = pick.pick_no
    return numbers


def completed_pick_label(
    season: str,
    round_number: int,
    original_roster_id: int,
    pick_numbers: dict[tuple[str, int, int], int],
) -> str:
    pick_number = pick_numbers.get((season, round_number, original_roster_id))
    return (
        f"{season}, Round {round_number}, Pick {pick_number} overall"
        if pick_number
        else f"{season} Round {round_number}"
    )
