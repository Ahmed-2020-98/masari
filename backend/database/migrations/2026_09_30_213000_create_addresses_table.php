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
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('sender');
            $table->string('label')->nullable();
            $table->string('name');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->foreignId('city_id')->constrained();
            $table->string('district')->nullable();
            $table->string('street')->nullable();
            $table->string('building_no', 20)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('short_address', 20)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['merchant_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
