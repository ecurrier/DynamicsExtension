import { Combobox, Field, Option, OptionGroup } from "@fluentui/react-components";
import { useMemo, useState } from "react";

import { type CodegenChoice } from "@/shared/types";

import { choiceMatches, choiceOptionLabel } from "../../lib";

const MAX_OPTIONS = 60;

interface ChoiceComboboxProps {
	value: CodegenChoice | null;
	local: CodegenChoice[];
	global: CodegenChoice[];
	loading: boolean;
	onChange: (name: string) => void;
}

/** The choice picker. A developer knows a choice by its logical name, so both names search and show. */
export const ChoiceCombobox = ({ value, local, global, loading, onChange }: ChoiceComboboxProps) => {
	const [query, setQuery] = useState("");
	const matching = useMemo(
		() => ({
			local: local.filter((choice) => choiceMatches(choice, query)).slice(0, MAX_OPTIONS),
			global: global.filter((choice) => choiceMatches(choice, query)).slice(0, MAX_OPTIONS),
		}),
		[local, global, query]
	);
	const nothingMatches = matching.local.length === 0 && matching.global.length === 0;

	const pick = (name: string) => {
		onChange(name);
		setQuery("");
	};

	return (
		<Field label="Choice">
			<Combobox
				freeform
				value={query || (value ? choiceOptionLabel(value) : "")}
				selectedOptions={value ? [value.name] : []}
				placeholder={loading ? "Loading choices..." : "Search by name or logical name..."}
				onOptionSelect={(_, data) => data.optionValue && pick(data.optionValue)}
				onChange={(event) => setQuery(event.target.value)}>
				{matching.local.length > 0 ? (
					<OptionGroup label="This table">
						{matching.local.map((choice) => (
							<Option key={choice.name} value={choice.name} text={choiceOptionLabel(choice)}>
								{choiceOptionLabel(choice)}
							</Option>
						))}
					</OptionGroup>
				) : null}
				{matching.global.length > 0 ? (
					<OptionGroup label="Global">
						{matching.global.map((choice) => (
							<Option key={choice.name} value={choice.name} text={choiceOptionLabel(choice)}>
								{choiceOptionLabel(choice)}
							</Option>
						))}
					</OptionGroup>
				) : null}
				{nothingMatches ? (
					<Option key="none" value="" text="" disabled>
						{loading ? "Loading choices..." : "No choice matches that search"}
					</Option>
				) : null}
			</Combobox>
		</Field>
	);
};
