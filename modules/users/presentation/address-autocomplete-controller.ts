import type { AddressSuggestionPort } from '../domain/ports/address-suggestion-port';
import type { UserAddressInput } from '../domain/user-address';

export class AddressAutocompleteController {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | undefined;
  private lastQuery = '';
  constructor(
    private readonly provider: AddressSuggestionPort,
    private readonly debounceMs = 400,
  ) {}

  search(
    query: string,
    onResult: (result: UserAddressInput[]) => void,
    onError: () => void,
  ): void {
    const normalized = query.trim();
    if (this.timer) clearTimeout(this.timer);
    if (normalized.length < 3 || normalized === this.lastQuery) return;
    this.lastQuery = normalized;
    this.request?.abort();
    this.timer = setTimeout(async () => {
      this.request = new AbortController();
      try {
        onResult(await this.provider.search(normalized, this.request.signal));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          onError();
        }
      }
    }, this.debounceMs);
  }

  retry(
    query: string,
    onResult: (result: UserAddressInput[]) => void,
    onError: () => void,
  ): void {
    this.lastQuery = '';
    this.search(query, onResult, onError);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.request?.abort();
  }
}
