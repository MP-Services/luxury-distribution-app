$(document).ready(function() {
    // Toggle the option mapping table on button click
    $('.option-mapping').click(function() {
        $(this).closest('.css-grid-table-row').find('.option-mapping-table').slideToggle();
    });
});