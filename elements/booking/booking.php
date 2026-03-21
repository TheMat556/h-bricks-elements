<?php
if (!defined('ABSPATH'))
    exit;

Class Booking extends \Bricks\Element
{
    public $category = 'h-additional-blocks';

    public $name = 'h-booking-calender';

    public $icon = 'ti-star';

    public function get_label()
    {
        return 'Booking Module';
    }

    public function set_controls() {
        $this->controls['showServices'] = [
            'tab'       => 'content',
            'label'     => esc_html__('Services anzeigen'),
            'type'      => 'checkbox',
            'default'   => true
        ];

        $this->controls['showSlots'] = [
            'tab'       =>  'content',
            'label'     =>  esc_html__('Zeitslots anzeigen'),
            'type'      => 'checkbox',
            'default'   => true,
        ];
    }

    public function enqueue_scripts() {
        $plugin_root_url    = plugin_dir_url(dirname(__FILE__, 2));
        $plugin_root_path   = plugin_dir_path(dirname(__FILE__, 2));

        wp_enqueue_style(
            'h-booking',
            $plugin_root_url . 'dist/booking.css',
            [],
            filemtime($plugin_root_path . 'dist/booking.css')
        );

        wp_enqueue_script(
            'h-booking',
            $plugin_root_url . 'dist/booking.js',
            [],
            filemtime($plugin_root_path . 'dist/booking.js')
        );
    }

    public function render()
    {
        $show_services  = !empty($this->settings['showServices']);
        $show_slots     = !empty($this->settings['showSlots']);
        
        $this->set_attribute('_root', 'class', 'h-calendar');
        $this->set_attribute('_root', 'data-show-services', $show_services ? 'true' : 'false');
        $this->set_attribute('_root', 'data-show-slots', $show_slots ? 'true' : 'false');

        echo  "<div {$this->render_attributes('_root')}>";
            if ($show_services) include __DIR__ . '/templates/col-services.php';
            
            include __DIR__ . '/templates/col-calendar.php';

            echo "<div class='h-cal-col'>
                <div>Zeitslot</div>
                <div>TEST3</div>
            </div>";
        echo '</div>';
    }
}