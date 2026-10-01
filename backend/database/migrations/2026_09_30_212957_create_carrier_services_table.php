<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('carrier_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carrier_id')->constrained()->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('name_ar');
            $table->unsignedTinyInteger('eta_min_days')->default(1);
            $table->unsignedTinyInteger('eta_max_days')->default(3);
            $table->decimal('max_weight_kg', 6, 2)->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['carrier_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carrier_services');
    }
};
