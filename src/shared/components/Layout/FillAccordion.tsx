import {
	Accordion,
	AccordionItem,
	type AccordionItemProps,
	type AccordionItemValue,
	AccordionPanel,
	type AccordionPanelProps,
	type AccordionProps,
	makeStyles,
	mergeClasses,
} from "@fluentui/react-components";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flex: "0 1 auto",
		minHeight: 0,
	},
	grow: {
		flex: "1 1 auto",
	},
	item: {
		display: "contents",
	},
	panel: {
		display: "flex",
		flexDirection: "column",
		flex: "0 1 auto",
		minHeight: "120px",
		paddingBottom: "8px",
	},
});

interface FillProps {
	grow?: boolean;
}

export const FillAccordion = <Value extends AccordionItemValue>({ className, grow = false, ...props }: AccordionProps<Value> & FillProps) => {
	const styles = useStyles();
	return <Accordion {...props} className={mergeClasses(styles.root, grow && styles.grow, className)} />;
};

export const FillAccordionItem = <Value extends AccordionItemValue>({ className, ...props }: AccordionItemProps<Value>) => {
	const styles = useStyles();
	return <AccordionItem {...props} className={mergeClasses(styles.item, className)} />;
};

export const FillAccordionPanel = ({ className, grow = false, ...props }: AccordionPanelProps & FillProps) => {
	const styles = useStyles();
	return <AccordionPanel {...props} className={mergeClasses(styles.panel, grow && styles.grow, className)} />;
};
