<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\TicketCategory;
use App\Enums\TicketStatus;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Enum;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Support tickets.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return TicketResource::collection(
            $this->merchant($request)->tickets()
                ->with('shipment')
                ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
                ->latest('updated_at')
                ->paginate(20)
        )->additional(['categories' => TicketCategory::options()]);
    }

    /**
     * Open a ticket with the first message.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'category' => ['required', new Enum(TicketCategory::class)],
            'shipment_id' => ['nullable', 'string'],
            'body' => ['required', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $merchant = $this->merchant($request);
        $shipmentId = ! empty($data['shipment_id']) ? $merchant->shipments()->where('uuid', $data['shipment_id'])->value('id') : null;

        $ticket = DB::transaction(function () use ($merchant, $request, $data, $shipmentId): Ticket {
            $ticket = $merchant->tickets()->create([
                'number' => 'T-'.Str::upper(Str::random(6)),
                'user_id' => $request->user()->id,
                'shipment_id' => $shipmentId,
                'subject' => $data['subject'],
                'category' => $data['category'],
                'status' => TicketStatus::Open,
                'last_reply_at' => now(),
            ]);

            $ticket->messages()->create([
                'user_id' => $request->user()->id,
                'body' => $data['body'],
                'attachments' => $this->storeAttachments($request->file('attachments', []), $ticket),
            ]);

            return $ticket;
        });

        return TicketResource::make($ticket->load(['messages.user', 'shipment']))->response()->setStatusCode(201);
    }

    /**
     * Ticket conversation.
     */
    public function show(Request $request, Ticket $ticket): TicketResource
    {
        $this->ensureOwned($request, $ticket);

        return TicketResource::make($ticket->load(['messages.user', 'shipment']));
    }

    /**
     * Reply to a ticket.
     */
    public function reply(Request $request, Ticket $ticket): TicketResource
    {
        $this->ensureOwned($request, $ticket);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'attachments' => $this->storeAttachments($request->file('attachments', []), $ticket),
        ]);
        $ticket->update(['status' => TicketStatus::Open, 'last_reply_at' => now()]);

        return TicketResource::make($ticket->load(['messages.user', 'shipment']));
    }

    /**
     * Close a ticket.
     */
    public function close(Request $request, Ticket $ticket): TicketResource
    {
        $this->ensureOwned($request, $ticket);
        $ticket->update(['status' => TicketStatus::Closed]);

        return TicketResource::make($ticket);
    }

    /**
     * Download a ticket attachment.
     */
    public function attachment(Request $request, Ticket $ticket, string $file): StreamedResponse
    {
        $this->ensureOwned($request, $ticket);
        $path = "tickets/{$ticket->id}/{$file}";
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }

    /**
     * @param  array<int, UploadedFile>  $files
     * @return list<array{name: string, path: string}>
     */
    private function storeAttachments(array $files, Ticket $ticket): array
    {
        return collect($files)->map(fn (UploadedFile $file) => [
            'name' => $file->getClientOriginalName(),
            'path' => basename($file->store("tickets/{$ticket->id}", 'local')),
        ])->values()->all();
    }
}
