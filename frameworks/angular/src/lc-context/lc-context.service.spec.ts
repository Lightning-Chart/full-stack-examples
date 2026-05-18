import { TestBed } from '@angular/core/testing';
import { LcContextService } from './lc-context.service';
import 'jasmine';

describe('LcContextService', () => {
	let service: LcContextService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(LcContextService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});