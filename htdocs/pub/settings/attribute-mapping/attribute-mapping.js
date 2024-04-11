$(document).ready(function() {
    // Toggle the option mapping table on button click
    $('.option-mapping').click(function() {
        $(this).closest('.css-grid-table-row').find('.option-mapping-table').slideToggle();
    });

    /**
     * Clearable text inputs
     */
    function tog(v){return v ? "addClass" : "removeClass";} 
    $(document).on("input", ".clearable", function(){
        $(this)[tog(this.value)]("x");
    }).on("mousemove", ".x", function( e ){
        $(this)[tog(this.offsetWidth-25 < e.clientX-this.getBoundingClientRect().left)]("onX");
    }).on("touchstart click", ".onX", function( ev ){
        ev.preventDefault();
        $(this).removeClass("x onX").val("").change();
    });

    // $('.clearable').trigger("input");
    // Uncomment the line above if you pre-fill values from LS or server
});