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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('markup_type', 10)->default('percent');
            $table->unsignedInteger('markup_value')->default(0)->comment('percent*100 or halalas');
            $table->unsignedInteger('cod_fee')->default(0)->comment('halalas');
            $table->unsignedInteger('return_fee')->default(0)->comment('halalas');
            $table->unsignedInteger('monthly_fee')->default(0)->comment('halalas');
            $table->json('features')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
