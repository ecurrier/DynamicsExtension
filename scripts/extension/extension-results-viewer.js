(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.ResultsViewer = (function () {
        const resultsFilterSelector = "#results-viewer-filter";
        const resultsTableSelector = "#results-viewer-table";
        const resultsCountSelector = "#results-count-text";
        const resultsCountFilteredSelector = "#results-count-filtered-text";

        const sortIconComponent = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-up" viewBox="0 0 16 16">
            <path d="M3.5 12.5a.5.5 0 0 1-1 0V3.707L1.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L3.5 3.707zm3.5-9a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5M7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z"/>
        </svg>`;

        let totalRecords = 0;

        function executeOnLoad() {
            attachHandlers();
            initializeViewer();
        }

        function attachHandlers() {
            $(resultsFilterSelector).on("keyup", filterResults);
        }

        function initializeViewer() {
            if (!localStorage || !localStorage.sharedData) {
                return;
            }

            const data = JSON.parse(localStorage.sharedData);

            initializeHeader(data.attributes);
            initializeBody(data.results, data.attributes);
            initializeResultsCount(data.results);
        }

        function initializeHeader(attributes) {
            const tableCellsHtml = attributes
                .map((attribute) => `<th scope="col">${attribute}<span class="table-header-component inactive"></span></th>`)
                .join("");
            $(`${resultsTableSelector} thead`).append(`<tr>${tableCellsHtml}</tr>`);
        }

        function initializeBody(results, attributes) {
            $.each(results, function (index, result) {
                let tableCellsHtml = "";

                $.each(attributes, function (index, attribute) {
                    const value = result[attribute];
                    tableCellsHtml = tableCellsHtml.concat(`<td>${value ?? "---"}</td>`);
                });

                const html = `
                    <tr>
                        ${tableCellsHtml}
                    </tr>`;

                $(`${resultsTableSelector} tbody`).append(html);
            });
        }

        function initializeResultsCount(results) {
            totalRecords = results.length;
            $(resultsCountSelector).text(`${totalRecords} total record(s)`);
        }

        function filterResults() {
            const filterQuery = $(this).val().toLowerCase();
            $(`${resultsTableSelector} tbody tr`).filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(filterQuery) > -1);
            });

            updateResultsCount();
        }

        function updateResultsCount() {
            const visibleRows = $(`${resultsTableSelector} tbody tr:visible`).length;
            const message = totalRecords === visibleRows ? null : `(Showing ${visibleRows} total record(s))`;

            $(resultsCountFilteredSelector).text(message);
        }

        return {
            executeOnLoad: executeOnLoad,
        };
    })();
})(this);

EMC.Extension.ResultsViewer.executeOnLoad();
