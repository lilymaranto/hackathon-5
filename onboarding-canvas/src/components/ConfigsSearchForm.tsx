"use client";

import { InstantTooltip } from "@/components/InstantTooltip";

type Props = {
  search?: string;
  mine?: boolean;
};

export function ConfigsSearchForm({ search, mine }: Props) {
  return (
    <form
      method="GET"
      action="/employee/configs"
      className="flex w-full min-w-0 justify-end sm:w-auto sm:flex-none"
    >
      <div className="flex items-center gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search configs"
          className="min-w-0 w-[14.65rem] rounded-full border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7] sm:w-[17.35rem]"
        />
        {mine ? <input type="hidden" name="mine" value="1" /> : null}
        <InstantTooltip label="Search configs by prospect name">
          <button
            type="submit"
            aria-label="Search configs by prospect name"
            className="shrink-0 rounded-full border border-[#8b30e7] px-5 py-2.5 text-base font-semibold text-[#8b30e7] hover:bg-[#f2e8ff]"
          >
            Search
          </button>
        </InstantTooltip>
      </div>
    </form>
  );
}
