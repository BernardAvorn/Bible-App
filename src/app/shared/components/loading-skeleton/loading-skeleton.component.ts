import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic shimmering skeleton block. Pass `lines` for a text-block
 * skeleton, or omit and size it with CSS for a card/box skeleton.
 */
@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  templateUrl: './loading-skeleton.component.html',
  styleUrl: './loading-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeletonComponent {
  readonly lines = input<number>(3);
}
