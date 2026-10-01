<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;

/**
 * Reads the bulk shipments sheet as raw rows; parsing and validation happen in the controller preview.
 */
class BulkShipmentsImport implements ToArray
{
    /**
     * @param  array<int, array<int, mixed>>  $array
     */
    public function array(array $array): void {}
}
