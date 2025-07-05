import { add } from "../app/utils/math"


test('add to numbers', () => {
    expect(add(1, 10)).toBe(11);
})